/**
 * openFDA drug label ETL: extract drug_interactions text into drug_interaction rows.
 */

import { createHash } from 'node:crypto';
import { DrugInteractionSourceEnum } from '$lib/model/enum/rxnorm.enum';
import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { searchRxnormConcepts } from './rxnorm-catalog.server';

const OPENFDA_BASE = 'https://api.fda.gov/drug/label.json';

export type OpenFdaInteractionImportOptions = {
	limit?: number;
	resumeSkip?: number;
	dryRun?: boolean;
	databaseUrl?: string;
	log?: (message: string) => void;
};

type SqlClient = NeonQueryFunction<false, false>;

function extractMentionTokens(text: string): string[] {
	return text
		.split(/[,;\n]/)
		.map((s) => s.trim())
		.filter((s) => s.length > 3 && s.length < 120)
		.slice(0, 20);
}

function externalId(setId: string, token: string): string {
	return createHash('sha256').update(`${setId}|${token}`).digest('hex').slice(0, 32);
}

export async function importOpenFdaInteractions(
	options: OpenFdaInteractionImportOptions = {}
): Promise<{ inserted: number; scanned: number }> {
	const log = options.log ?? ((m) => console.log(m));
	const limit = Math.min(options.limit ?? 50, 500);
	const skip = options.resumeSkip ?? 0;
	const dryRun = options.dryRun ?? false;

	const url = `${OPENFDA_BASE}?search=drug_interactions:*&limit=${limit}&skip=${skip}`;
	log(`Fetching ${url}`);
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`openFDA failed ${res.status}`);
	}
	const body = (await res.json()) as {
		results?: Array<{
			set_id?: string[];
			openfda?: { generic_name?: string[]; brand_name?: string[] };
			drug_interactions?: string[];
		}>;
	};
	const results = body.results ?? [];
	let inserted = 0;
	const sql = dryRun
		? null
		: (neon(options.databaseUrl ?? ensureDatabaseUrl()) as SqlClient);
	const nameCache = new Map<string, string | null>();

	async function nameToRxcui(name: string): Promise<string | null> {
		const k = name.toLowerCase();
		if (nameCache.has(k)) return nameCache.get(k) ?? null;
		const hits = await searchRxnormConcepts({ query: name, limit: 2 });
		const rxcui = hits[0]?.rxcui ?? null;
		nameCache.set(k, rxcui);
		return rxcui;
	}

	for (const label of results) {
		const setId = label.set_id?.[0] ?? 'unknown';
		const generic = label.openfda?.generic_name?.[0] ?? '';
		const baseRxcui = generic ? await nameToRxcui(generic) : null;
		const sections = label.drug_interactions ?? [];
		for (const section of sections) {
			const tokens = extractMentionTokens(section);
			for (const token of tokens) {
				const otherRxcui = await nameToRxcui(token);
				if (!baseRxcui || !otherRxcui || baseRxcui === otherRxcui) continue;
				const desc = section.slice(0, 2000);
				if (dryRun || !sql) continue;
				await sql.query(
					`INSERT INTO drug_interaction (
						source, external_id, rxcui_a, rxcui_b,
						ingredient_rxcui_a, ingredient_rxcui_b,
						severity, description, release_or_version
					) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
					ON CONFLICT (source, external_id) DO NOTHING`,
					[
						DrugInteractionSourceEnum.OPENFDA,
						externalId(setId, token),
						baseRxcui,
						otherRxcui,
						baseRxcui,
						otherRxcui,
						PrescribingAlertSeverityEnum.MODERATE,
						desc,
						setId
					]
				);
				inserted++;
			}
		}
	}
	return { inserted, scanned: results.length };
}
