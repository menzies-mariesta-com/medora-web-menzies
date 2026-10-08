/**
 * CDC / NCHS ICD-10-CM catalogue import into `diagnosis_code` (system = ICD10_CM).
 *
 * Source: official Code Descriptions ZIP on CDC FTP
 * (e.g. FY2027 `icd10cm-code-descriptions-2027.zip`).
 *
 * Kept separate from WHO ICD-10 / ICD-11 so hospitals can bind to CM alone.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { DiagnosisCodingSystemEnum } from '$lib/model/enum/diagnosis-coding-system.enum';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import {
	upsertDiagnosisCodeRows,
	type DiagnosisCodeUpsertRow
} from '$lib/server/medora/clinical/diagnosis-code-upsert.server';

export const ICD10_CM_API_SOURCE = 'CDC_ICD10_CM';

/** FY2027 (effective Oct 1, 2026). Override with ICD10_CM_ZIP_URL. */
export const DEFAULT_ICD10_CM_ZIP_URL =
	'https://ftp.cdc.gov/pub/health_statistics/nchs/Publications/ICD10CM/2027/icd10cm-code-descriptions-2027.zip';

export const DEFAULT_ICD10_CM_RELEASE_ID = 'FY2027';

export type Icd10CmImportResult = {
	system: typeof DiagnosisCodingSystemEnum.ICD10_CM;
	inserted: number;
	updated: number;
	total: number;
	releaseId: string;
	sourceUrl: string;
};

export type Icd10CmImportOptions = {
	zipUrl?: string;
	releaseId?: string;
	/** Cap rows (CLI testing). 0 = no limit. */
	limit?: number;
	dryRun?: boolean;
	/** Prefer local cache under `.cache/icd-import/ICD10_CM.json`. */
	cacheDir?: string | null;
	useCache?: boolean;
	databaseUrl?: string;
	notesPrefix?: string;
	log?: (message: string) => void;
};

export class Icd10CmImportError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'Icd10CmImportError';
	}
}

type SqlClient = NeonQueryFunction<false, false>;

function defaultCacheDir(): string {
	return join(process.cwd(), '.cache', 'icd-import');
}

function cachePath(dir: string): string {
	return join(dir, 'ICD10_CM.json');
}

function writeCache(
	dir: string,
	payload: {
		releaseId: string;
		sourceUrl: string;
		rows: DiagnosisCodeUpsertRow[];
	}
): void {
	mkdirSync(dir, { recursive: true });
	writeFileSync(cachePath(dir), JSON.stringify(payload), 'utf8');
}

function readCache(dir: string): {
	releaseId: string;
	sourceUrl: string;
	rows: DiagnosisCodeUpsertRow[];
} | null {
	const path = cachePath(dir);
	if (!existsSync(path)) return null;
	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as {
			releaseId?: string;
			sourceUrl?: string;
			rows?: DiagnosisCodeUpsertRow[];
		};
		if (
			typeof raw.releaseId !== 'string' ||
			!Array.isArray(raw.rows) ||
			raw.rows.length === 0
		) {
			return null;
		}
		return {
			releaseId: raw.releaseId,
			sourceUrl: raw.sourceUrl ?? '',
			rows: raw.rows
		};
	} catch {
		return null;
	}
}

/** Insert decimal after character 3 when length > 3 (`A000` -> `A00.0`). */
export function formatIcd10CmCode(raw: string): string {
	const compact = raw.replace(/\./g, '').trim().toUpperCase();
	if (compact.length <= 3) return compact;
	return `${compact.slice(0, 3)}.${compact.slice(3)}`;
}

/**
 * Parse NCHS order file fixed-width lines.
 * Includes category headers (flag 0) and billable leaves (flag 1).
 */
export function parseIcd10CmOrderText(
	text: string,
	releaseId: string
): DiagnosisCodeUpsertRow[] {
	const out: DiagnosisCodeUpsertRow[] = [];
	const seen = new Set<string>();
	for (const line of text.split(/\r?\n/)) {
		if (line.length < 17) continue;
		const rawCode = line.slice(6, 13).trim();
		if (!rawCode) continue;
		const shortDesc = line.slice(16, 76).trim();
		const longDesc =
			line.length > 77 ? line.slice(77).trim() : shortDesc;
		const description = (longDesc || shortDesc).trim();
		if (!description) continue;
		const code = formatIcd10CmCode(rawCode);
		if (seen.has(code)) continue;
		seen.add(code);
		out.push({ code, description, releaseId });
	}
	return out;
}

function findOrderFileEntry(
	files: Record<string, Uint8Array>
): { name: string; bytes: Uint8Array } | null {
	const entries = Object.entries(files);
	const order = entries.find(([name]) =>
		/icd10cm[-_]?order[-_]?\d*\.txt$/i.test(name.replace(/\\/g, '/').split('/').pop() ?? '')
	);
	if (order) return { name: order[0], bytes: order[1] };
	const anyOrder = entries.find(([name]) =>
		/order.*\.txt$/i.test(name)
	);
	if (anyOrder) return { name: anyOrder[0], bytes: anyOrder[1] };
	return null;
}

async function downloadZip(url: string, log: (m: string) => void): Promise<Uint8Array> {
	log(`Downloading ICD-10-CM zip: ${url}`);
	const res = await fetch(url);
	if (!res.ok) {
		throw new Icd10CmImportError(
			`CDC ICD-10-CM download failed (${res.status}) for ${url}`
		);
	}
	const buf = new Uint8Array(await res.arrayBuffer());
	log(`Downloaded ${(buf.byteLength / (1024 * 1024)).toFixed(2)} MiB`);
	return buf;
}

function extractOrderRows(
	zipBytes: Uint8Array,
	releaseId: string,
	log: (m: string) => void
): DiagnosisCodeUpsertRow[] {
	const files = unzipSync(zipBytes);
	const entry = findOrderFileEntry(files);
	if (!entry) {
		throw new Icd10CmImportError(
			'ICD-10-CM zip missing icd10cm-order-*.txt'
		);
	}
	log(`Parsing order file ${entry.name}`);
	const text = new TextDecoder('latin1').decode(entry.bytes);
	const rows = parseIcd10CmOrderText(text, releaseId);
	if (rows.length === 0) {
		throw new Icd10CmImportError('ICD-10-CM order file produced 0 rows');
	}
	log(`Parsed ${rows.length} ICD-10-CM codes (headers + leaves)`);
	return rows;
}

export async function importIcd10CmCatalogue(
	options: Icd10CmImportOptions = {}
): Promise<Icd10CmImportResult> {
	const log = options.log ?? ((m: string) => console.log(m));
	const zipUrl =
		options.zipUrl?.trim() ||
		process.env.ICD10_CM_ZIP_URL?.trim() ||
		DEFAULT_ICD10_CM_ZIP_URL;
	const releaseId =
		options.releaseId?.trim() ||
		process.env.ICD10_CM_RELEASE_ID?.trim() ||
		DEFAULT_ICD10_CM_RELEASE_ID;
	const hardLimit = Number(options.limit ?? 0) || 0;
	const dryRun = Boolean(options.dryRun);
	const notesPrefix =
		options.notesPrefix?.trim() || 'Imported by icd10-cm-import';
	const cacheDir =
		options.cacheDir === null
			? null
			: (options.cacheDir?.trim() || defaultCacheDir());
	const useCache = options.useCache !== false && cacheDir != null;
	const system = DiagnosisCodingSystemEnum.ICD10_CM;

	let rows: DiagnosisCodeUpsertRow[];
	let sourceUrl = zipUrl;

	const cached = useCache && cacheDir ? readCache(cacheDir) : null;
	if (cached && (hardLimit <= 0 || cached.rows.length >= hardLimit)) {
		rows =
			hardLimit > 0
				? cached.rows.slice(0, hardLimit)
				: cached.rows;
		sourceUrl = cached.sourceUrl || zipUrl;
		log(
			`[${system}] loaded ${rows.length} rows from cache ${cachePath(cacheDir!)}`
		);
	} else {
		const zipBytes = await downloadZip(zipUrl, log);
		rows = extractOrderRows(zipBytes, releaseId, log);
		if (hardLimit > 0) rows = rows.slice(0, hardLimit);
		if (cacheDir && rows.length > 0) {
			writeCache(cacheDir, { releaseId, sourceUrl: zipUrl, rows });
			log(
				`[${system}] wrote cache ${cachePath(cacheDir)} (${rows.length} rows)`
			);
		}
	}

	if (dryRun) {
		log(`[${system}] dry-run sample: ${JSON.stringify(rows.slice(0, 5))}`);
		return {
			system,
			inserted: 0,
			updated: 0,
			total: rows.length,
			releaseId,
			sourceUrl
		};
	}

	const databaseUrl =
		options.databaseUrl?.trim() ||
		(() => {
			try {
				return ensureDatabaseUrl();
			} catch {
				const raw = (process.env.DATABASE_URL ?? '').trim();
				if (!raw) {
					throw new Icd10CmImportError(
						'Missing DATABASE_URL (required for ICD-10-CM import unless dry-run).'
					);
				}
				return raw;
			}
		})();
	const sql: SqlClient = neon(databaseUrl);
	const notes = `${notesPrefix} (${new Date().toISOString()}) source=${sourceUrl}`;
	const counts = await upsertDiagnosisCodeRows(
		sql,
		system,
		rows,
		releaseId,
		ICD10_CM_API_SOURCE,
		notes,
		log
	);
	log(
		`[${system}] upserted=${counts.total} (inserted=${counts.inserted}, updated=${counts.updated})`
	);
	return {
		system,
		inserted: counts.inserted,
		updated: counts.updated,
		total: counts.total,
		releaseId,
		sourceUrl
	};
}
