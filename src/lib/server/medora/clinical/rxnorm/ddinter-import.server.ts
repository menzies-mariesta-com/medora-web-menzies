/**
 * DDInter CSV import into drug_interaction (source=DDINTER).
 * License: review docs/rxnorm-cds-licenses.md before prod import.
 * Set ALLOW_DDINTER_IMPORT=true after legal sign-off.
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { DrugInteractionSourceEnum } from '$lib/model/enum/rxnorm.enum';
import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import { searchRxnormConcepts } from './rxnorm-catalog.server';

export const DEFAULT_DDINTER_CSV_URL =
	'https://ddinter.scbdd.com/static/media/download/ddinter_downloads_code_A.csv';

export type DdinterImportOptions = {
	csvUrl?: string;
	csvPath?: string;
	limit?: number;
	dryRun?: boolean;
	databaseUrl?: string;
	log?: (message: string) => void;
};

export class DdinterImportError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DdinterImportError';
	}
}

type SqlClient = NeonQueryFunction<false, false>;

function mapDdinterSeverity(level: string): string {
	const v = level.toLowerCase();
	if (v.includes('major') || v.includes('high')) {
		return PrescribingAlertSeverityEnum.SEVERE;
	}
	if (v.includes('moderate') || v.includes('medium')) {
		return PrescribingAlertSeverityEnum.MODERATE;
	}
	return PrescribingAlertSeverityEnum.MILD;
}

async function resolveDrugToRxcui(
	drugName: string,
	cache: Map<string, string | null>
): Promise<string | null> {
	const key = drugName.trim().toLowerCase();
	if (cache.has(key)) return cache.get(key) ?? null;
	const hits = await searchRxnormConcepts({ query: drugName, limit: 3 });
	const inHit = hits.find((h) => h.tty === 'IN') ?? hits[0];
	const rxcui = inHit?.rxcui ?? null;
	cache.set(key, rxcui);
	return rxcui;
}

function externalId(a: string, b: string, level: string): string {
	return createHash('sha256')
		.update(`${a}|${b}|${level}`)
		.digest('hex')
		.slice(0, 32);
}

export async function importDdinterCatalogue(
	options: DdinterImportOptions = {}
): Promise<{ inserted: number; skipped: number }> {
	const log = options.log ?? ((m) => console.log(m));
	if (process.env.ALLOW_DDINTER_IMPORT !== 'true' && !options.dryRun) {
		throw new DdinterImportError(
			'Set ALLOW_DDINTER_IMPORT=true after license review (see docs/rxnorm-cds-licenses.md)'
		);
	}
	const cacheDir = join(process.cwd(), '.cache', 'ddinter');
	mkdirSync(cacheDir, { recursive: true });
	let csvPath = options.csvPath;
	if (!csvPath) {
		const url = options.csvUrl ?? process.env.DDINTER_CSV_URL ?? DEFAULT_DDINTER_CSV_URL;
		csvPath = join(cacheDir, 'ddinter.csv');
		if (!existsSync(csvPath)) {
			log(`Downloading ${url}`);
			const res = await fetch(url);
			if (!res.ok) throw new DdinterImportError(`Download failed ${res.status}`);
			writeFileSync(csvPath, Buffer.from(await res.arrayBuffer()));
		}
	}

	const limit = options.limit ?? 0;
	const dryRun = options.dryRun ?? false;
	const rxcuiCache = new Map<string, string | null>();
	let inserted = 0;
	let skipped = 0;
	let lineNo = 0;

	const rl = createInterface({
		input: createReadStream(csvPath, { encoding: 'utf8' }),
		crlfDelay: Infinity
	});

	const pending: Array<{
		externalId: string;
		ingredientRxcuiA: string;
		ingredientRxcuiB: string;
		severity: string;
		description: string;
	}> = [];

	for await (const line of rl) {
		lineNo++;
		if (lineNo === 1 && line.toLowerCase().includes('drug')) continue;
		if (!line.trim()) continue;
		const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
		if (cols.length < 4) continue;
		const drugA = cols[0] ?? '';
		const drugB = cols[1] ?? '';
		const level = cols[2] ?? 'moderate';
		const mechanism = cols[3] ?? '';
		if (!drugA || !drugB) {
			skipped++;
			continue;
		}
		const rxcuiA = await resolveDrugToRxcui(drugA, rxcuiCache);
		const rxcuiB = await resolveDrugToRxcui(drugB, rxcuiCache);
		if (!rxcuiA || !rxcuiB) {
			skipped++;
			continue;
		}
		pending.push({
			externalId: externalId(drugA, drugB, level),
			ingredientRxcuiA: rxcuiA,
			ingredientRxcuiB: rxcuiB,
			severity: mapDdinterSeverity(level),
			description: `${drugA} + ${drugB}: ${mechanism || level}`.slice(0, 4000)
		});
		if (limit > 0 && pending.length >= limit) break;
	}

	log(`DDInter rows ready: ${pending.length}, skipped: ${skipped}`);
	if (dryRun || !pending.length) {
		return { inserted: 0, skipped };
	}

	const sql = neon(options.databaseUrl ?? ensureDatabaseUrl()) as SqlClient;
	const batch = 200;
	for (let i = 0; i < pending.length; i += batch) {
		const chunk = pending.slice(i, i + batch);
		for (const row of chunk) {
			await sql.query(
				`INSERT INTO drug_interaction (
					source, external_id, ingredient_rxcui_a, ingredient_rxcui_b,
					severity, description, release_or_version
				) VALUES ($1,$2,$3,$4,$5,$6,$7)
				ON CONFLICT (source, external_id) DO UPDATE SET
					severity = EXCLUDED.severity,
					description = EXCLUDED.description,
					updated_at = now()`,
				[
					DrugInteractionSourceEnum.DDINTER,
					row.externalId,
					row.ingredientRxcuiA,
					row.ingredientRxcuiB,
					row.severity,
					row.description,
					'ddinter-import'
				]
			);
			inserted++;
		}
	}
	return { inserted, skipped };
}
