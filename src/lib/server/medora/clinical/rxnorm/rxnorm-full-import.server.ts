/**
 * RxNorm Full RRF import (NLM UMLS terms apply).
 *
 * Download: https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_current.zip
 * Override: RXNORM_FULL_ZIP_URL
 *
 * Prerequisites: DATABASE_URL, UMLS/RxNorm license acceptance for your deployment.
 */

import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import {
	RXNORM_INGREDIENT_RELAS,
	RXNORM_PRESCRIBE_TTYS,
	RxnormImportSourceEnum
} from '$lib/model/enum/rxnorm.enum';
import {
	normalizeRxnormName,
	parseRxnConsoLine,
	parseRxnRelLine,
	parseRxnSatLine
} from './rxnorm-rrf-parse.util';
import {
	recordRxnormRelease,
	upsertRxnormConceptRows,
	upsertRxnormNdcRows,
	upsertRxnormRelRows,
	type RxnormConceptUpsertRow,
	type RxnormNdcUpsertRow,
	type RxnormRelUpsertRow
} from './rxnorm-upsert.server';

export const DEFAULT_RXNORM_FULL_ZIP_URL =
	'https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_current.zip';

export type RxnormImportResult = {
	releaseId: string;
	conceptCount: number;
	relCount: number;
	ndcCount: number;
	inserted: number;
	updated: number;
	sourceUrl: string;
};

export type RxnormImportOptions = {
	zipUrl?: string;
	releaseId?: string;
	limit?: number;
	dryRun?: boolean;
	cacheDir?: string | null;
	useCache?: boolean;
	/** Only import prescribe/mapping TTYs (faster first deploy). */
	prescribeOnly?: boolean;
	includeNdc?: boolean;
	databaseUrl?: string;
	notesPrefix?: string;
	log?: (message: string) => void;
};

export class RxnormImportError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RxnormImportError';
	}
}

type SqlClient = NeonQueryFunction<false, false>;

type CachePayload = {
	releaseId: string;
	sourceUrl: string;
	concepts: RxnormConceptUpsertRow[];
	rels: RxnormRelUpsertRow[];
	ndcs: RxnormNdcUpsertRow[];
};

function defaultCacheDir(): string {
	return join(process.cwd(), '.cache', 'rxnorm-import');
}

function cacheJsonPath(dir: string): string {
	return join(dir, 'rxnorm-parsed.json');
}

function logDefault(message: string): void {
	console.log(message);
}

async function downloadZip(url: string, dest: string, log: (m: string) => void): Promise<void> {
	log(`Downloading ${url}`);
	const res = await fetch(url);
	if (!res.ok) {
		throw new RxnormImportError(`Download failed ${res.status}: ${url}`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(dest, buf);
	log(`Saved ${dest} (${buf.length} bytes)`);
}

function extractRrf(zipPath: string, rrfName: string, outDir: string): string {
	mkdirSync(outDir, { recursive: true });
	const outPath = join(outDir, rrfName);
	if (existsSync(outPath)) return outPath;
	const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
	const match = listing
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line.endsWith(`/${rrfName}`) || line === rrfName);
	if (!match) {
		throw new RxnormImportError(`RRF ${rrfName} not found in zip`);
	}
	const data = execFileSync('unzip', ['-p', zipPath, match], {
		maxBuffer: 1024 * 1024 * 512
	});
	writeFileSync(outPath, data);
	return outPath;
}

async function readLines(
	filePath: string,
	onLine: (line: string) => void | Promise<void>,
	limit: number
): Promise<number> {
	const rl = createInterface({
		input: createReadStream(filePath, { encoding: 'utf8' }),
		crlfDelay: Infinity
	});
	let count = 0;
	for await (const line of rl) {
		await onLine(line);
		count++;
		if (limit > 0 && count >= limit) break;
	}
	return count;
}

const PRESCRIBE_TTY_SET = new Set<string>(RXNORM_PRESCRIBE_TTYS);
const ING_RELA_SET = new Set<string>(RXNORM_INGREDIENT_RELAS);

async function parseFromZip(
	zipPath: string,
	releaseId: string,
	opts: {
		limit: number;
		prescribeOnly: boolean;
		includeNdc: boolean;
		log: (m: string) => void;
	}
): Promise<CachePayload> {
	const extractDir = join(defaultCacheDir(), 'rrf');
	const consoPath = extractRrf(zipPath, 'RXNCONSO.RRF', extractDir);
	const relPath = extractRrf(zipPath, 'RXNREL.RRF', extractDir);

	const concepts: RxnormConceptUpsertRow[] = [];
	const conceptSeen = new Set<string>();

	log(`Parsing RXNCONSO from ${consoPath}`);
	await readLines(
		consoPath,
		(line) => {
			const row = parseRxnConsoLine(line);
			if (!row || row.sab !== 'RXNORM' || row.lat !== 'ENG') return;
			if (row.suppress === 'Y') return;
			if (opts.prescribeOnly && !PRESCRIBE_TTY_SET.has(row.tty)) return;
			if (conceptSeen.has(row.rxcui)) return;
			conceptSeen.add(row.rxcui);
			concepts.push({
				rxcui: row.rxcui,
				name: row.str.slice(0, 1024),
				tty: row.tty,
				suppress: row.suppress || null,
				normalizedName: normalizeRxnormName(row.str).slice(0, 1024),
				releaseId
			});
		},
		opts.limit
	);

	const rels: RxnormRelUpsertRow[] = [];
	const relSeen = new Set<string>();
	log(`Parsing RXNREL from ${relPath}`);
	await readLines(
		relPath,
		(line) => {
			const row = parseRxnRelLine(line);
			if (!row || row.sab !== 'RXNORM') return;
			if (row.suppress === 'Y') return;
			if (!ING_RELA_SET.has(row.rela)) return;
			const key = `${row.rxcui1}|${row.rxcui2}|${row.rela}`;
			if (relSeen.has(key)) return;
			relSeen.add(key);
			rels.push({
				rxcui1: row.rxcui1,
				rxcui2: row.rxcui2,
				rela: row.rela,
				releaseId
			});
		},
		opts.limit > 0 ? opts.limit * 10 : 0
	);

	const ndcs: RxnormNdcUpsertRow[] = [];
	if (opts.includeNdc) {
		try {
			const satPath = extractRrf(zipPath, 'RXNSAT.RRF', extractDir);
			log(`Parsing RXNSAT NDC from ${satPath}`);
			const ndcSeen = new Set<string>();
			await readLines(
				satPath,
				(line) => {
					const row = parseRxnSatLine(line);
					if (!row || row.sab !== 'RXNORM' || row.atn !== 'NDC') return;
					if (row.suppress === 'Y') return;
					const ndc = row.atv.trim();
					if (!ndc || ndcSeen.has(ndc)) return;
					ndcSeen.add(ndc);
					ndcs.push({ rxcui: row.rxcui, ndc, releaseId });
				},
				opts.limit > 0 ? opts.limit * 5 : 0
			);
		} catch (e) {
			opts.log(`RXNSAT skip: ${(e as Error).message}`);
		}
	}

	return {
		releaseId,
		sourceUrl: zipPath,
		concepts,
		rels,
		ndcs
	};
}

function writeCache(dir: string, payload: CachePayload): void {
	mkdirSync(dir, { recursive: true });
	writeFileSync(cacheJsonPath(dir), JSON.stringify(payload), 'utf8');
}

function readCache(dir: string): CachePayload | null {
	const path = cacheJsonPath(dir);
	if (!existsSync(path)) return null;
	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as CachePayload;
		if (!raw?.concepts?.length) return null;
		return raw;
	} catch {
		return null;
	}
}

export async function importRxnormFullCatalogue(
	options: RxnormImportOptions = {}
): Promise<RxnormImportResult> {
	const log = options.log ?? logDefault;
	const zipUrl =
		options.zipUrl ??
		process.env.RXNORM_FULL_ZIP_URL ??
		DEFAULT_RXNORM_FULL_ZIP_URL;
	const releaseId =
		options.releaseId ??
		process.env.RXNORM_RELEASE_ID ??
		new Date().toISOString().slice(0, 10);
	const limit = options.limit ?? 0;
	const dryRun = options.dryRun ?? false;
	const cacheDir =
		options.cacheDir === null
			? null
			: (options.cacheDir ?? defaultCacheDir());
	const useCache = options.useCache ?? false;
	const prescribeOnly = options.prescribeOnly ?? true;
	const includeNdc = options.includeNdc ?? false;

	let payload: CachePayload | null =
		useCache && cacheDir ? readCache(cacheDir) : null;

	if (!payload) {
		const cacheRoot = cacheDir ?? defaultCacheDir();
		mkdirSync(cacheRoot, { recursive: true });
		const zipPath = join(cacheRoot, 'RxNorm_full_current.zip');
		if (!existsSync(zipPath)) {
			await downloadZip(zipUrl, zipPath, log);
		}
		payload = await parseFromZip(zipPath, releaseId, {
			limit,
			prescribeOnly,
			includeNdc,
			log
		});
		payload.sourceUrl = zipUrl;
		if (cacheDir) writeCache(cacheDir, payload);
	}

	log(
		`Parsed ${payload.concepts.length} concepts, ${payload.rels.length} rels, ${payload.ndcs.length} NDC`
	);

	if (dryRun) {
		return {
			releaseId: payload.releaseId,
			conceptCount: payload.concepts.length,
			relCount: payload.rels.length,
			ndcCount: payload.ndcs.length,
			inserted: 0,
			updated: 0,
			sourceUrl: payload.sourceUrl
		};
	}

	const databaseUrl = options.databaseUrl ?? ensureDatabaseUrl();
	const sql = neon(databaseUrl) as SqlClient;

	const { inserted, updated } = await upsertRxnormConceptRows(
		sql,
		payload.concepts,
		log
	);
	const relCount = await upsertRxnormRelRows(sql, payload.rels, log);
	let ndcCount = 0;
	if (payload.ndcs.length) {
		ndcCount = await upsertRxnormNdcRows(sql, payload.ndcs, log);
	}

	await recordRxnormRelease(
		sql,
		{
			releaseId: payload.releaseId,
			source: RxnormImportSourceEnum.NLM_RXNORM_FULL,
			conceptCount: payload.concepts.length,
			relCount,
			notes: options.notesPrefix
				? `${options.notesPrefix} ${payload.sourceUrl}`
				: payload.sourceUrl
		},
		log
	);

	return {
		releaseId: payload.releaseId,
		conceptCount: payload.concepts.length,
		relCount,
		ndcCount,
		inserted,
		updated,
		sourceUrl: payload.sourceUrl
	};
}
