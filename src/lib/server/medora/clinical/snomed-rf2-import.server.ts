/**
 * SNOMED CT International RF2 Snapshot import into `diagnosis_code` (system = SNOMED_CT).
 * Requires a licensed RF2 drop under SNOMED_RF2_DIR (MLDS / national NRC).
 */

import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { DiagnosisCodingSystemEnum } from '$lib/model/enum/diagnosis-coding-system.enum';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import {
	upsertDiagnosisCodeRows,
	type DiagnosisCodeUpsertRow
} from '$lib/server/medora/clinical/diagnosis-code-upsert.server';

export const SNOMED_RF2_SOURCE = 'SNOMED_RF2';

const FSN_TYPE_ID = '900000000000003001';
const SYNONYM_TYPE_ID = '900000000000013009';

export type SnomedImportResult = {
	system: typeof DiagnosisCodingSystemEnum.SNOMED_CT;
	inserted: number;
	updated: number;
	total: number;
	releaseId: string;
	rf2Dir: string;
};

export type SnomedImportOptions = {
	rf2Dir?: string;
	releaseId?: string;
	/** Import all active concepts; default false = finding/disorder subset only. */
	full?: boolean;
	limit?: number;
	dryRun?: boolean;
	databaseUrl?: string;
	notesPrefix?: string;
	log?: (message: string) => void;
};

export class SnomedRf2ImportError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SnomedRf2ImportError';
	}
}

type SqlClient = NeonQueryFunction<false, false>;

type ConceptTerms = {
	fsn: string | null;
	synonym: string | null;
};

/** FSN semantic tags for default clinical diagnosis subset. */
export function fsnMatchesClinicalSubset(fsn: string): boolean {
	return /\((finding|disorder)\)$/i.test(fsn.trim());
}

export function pickSnomedDisplayTerm(
	fsn: string | null,
	synonym: string | null
): string | null {
	const syn = synonym?.trim();
	if (syn) return syn;
	const f = fsn?.trim();
	if (!f) return null;
	return f.replace(/\s*\([^)]+\)\s*$/u, '').trim() || f;
}

function resolveRf2Dir(options: SnomedImportOptions): string {
	const dir =
		options.rf2Dir?.trim() || process.env.SNOMED_RF2_DIR?.trim() || '';
	if (!dir || !existsSync(dir)) {
		throw new SnomedRf2ImportError(
			'Missing or invalid SNOMED_RF2_DIR. Download a licensed SNOMED CT International RF2 Snapshot and set SNOMED_RF2_DIR to its root folder.'
		);
	}
	return dir;
}

function walkFiles(root: string): string[] {
	const out: string[] = [];
	const stack = [root];
	while (stack.length > 0) {
		const dir = stack.pop()!;
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) {
				stack.push(path);
			} else if (name.endsWith('.txt')) {
				out.push(path);
			}
		}
	}
	return out;
}

function findRf2File(root: string, includes: string[]): string | null {
	for (const path of walkFiles(root)) {
		const base = path.split('/').pop() ?? path;
		if (!includes.every((part) => base.includes(part))) continue;
		return path;
	}
	return null;
}

function releaseIdFromPath(conceptPath: string, override?: string): string {
	if (override?.trim()) return override.trim();
	const base = conceptPath.split('/').pop() ?? '';
	const m = base.match(/(\d{8})/);
	return m?.[1] ?? 'unknown';
}

async function loadActiveConceptIds(path: string): Promise<Set<string>> {
	const ids = new Set<string>();
	const rl = createInterface({
		input: createReadStream(path, { encoding: 'utf8' }),
		crlfDelay: Infinity
	});
	let first = true;
	for await (const line of rl) {
		if (first) {
			first = false;
			continue;
		}
		if (!line.trim()) continue;
		const cols = line.split('\t');
		if (cols.length < 3) continue;
		const [id, , active] = cols;
		if (active === '1') ids.add(id);
	}
	return ids;
}

async function loadDescriptions(
	path: string,
	activeConcepts: Set<string>,
	log: (message: string) => void
): Promise<Map<string, ConceptTerms>> {
	const terms = new Map<string, ConceptTerms>();
	const rl = createInterface({
		input: createReadStream(path, { encoding: 'utf8' }),
		crlfDelay: Infinity
	});
	let first = true;
	let lineNo = 0;
	for await (const line of rl) {
		lineNo += 1;
		if (first) {
			first = false;
			continue;
		}
		if (!line.trim()) continue;
		const cols = line.split('\t');
		if (cols.length < 8) continue;
		const active = cols[2];
		const conceptId = cols[4];
		const lang = cols[5]?.toLowerCase() ?? '';
		const typeId = cols[6];
		const term = cols[7];
		if (active !== '1' || !activeConcepts.has(conceptId)) continue;
		if (!lang.startsWith('en')) continue;

		let row = terms.get(conceptId);
		if (!row) {
			row = { fsn: null, synonym: null };
			terms.set(conceptId, row);
		}
		if (typeId === FSN_TYPE_ID && !row.fsn) {
			row.fsn = term;
		} else if (typeId === SYNONYM_TYPE_ID && !row.synonym) {
			row.synonym = term;
		}
		if (lineNo % 500_000 === 0) {
			log(`SNOMED_RF2 description scan line ${lineNo}`);
		}
	}
	return terms;
}

function buildRows(
	terms: Map<string, ConceptTerms>,
	releaseId: string,
	full: boolean,
	hardLimit: number
): DiagnosisCodeUpsertRow[] {
	const rows: DiagnosisCodeUpsertRow[] = [];
	for (const [conceptId, t] of terms) {
		if (!full && (!t.fsn || !fsnMatchesClinicalSubset(t.fsn))) continue;
		const description = pickSnomedDisplayTerm(t.fsn, t.synonym);
		if (!description) continue;
		rows.push({ code: conceptId, description, releaseId });
		if (hardLimit > 0 && rows.length >= hardLimit) break;
	}
	return rows;
}

export function isSnomedSeedSkipped(): boolean {
	const raw = (process.env.SNOMED_SKIP_SEED ?? '').trim().toLowerCase();
	return raw === '1' || raw === 'true' || raw === 'yes';
}

export async function importSnomedRf2Catalogue(
	options: SnomedImportOptions = {}
): Promise<SnomedImportResult> {
	const log = options.log ?? console.log;
	const rf2Dir = resolveRf2Dir(options);
	const conceptPath = findRf2File(rf2Dir, [
		'sct2_Concept_Snapshot'
	]);
	const descriptionPath = findRf2File(rf2Dir, [
		'sct2_Description_Snapshot',
		'en'
	]);
	if (!conceptPath || !descriptionPath) {
		throw new SnomedRf2ImportError(
			`Could not find Snapshot Concept/Description RF2 files under ${rf2Dir}. Expected names like sct2_Concept_Snapshot_* and sct2_Description_Snapshot-en_*`
		);
	}

	const releaseId = releaseIdFromPath(
		conceptPath,
		options.releaseId ?? process.env.SNOMED_RELEASE_ID
	);
	const full =
		options.full === true ||
		(process.env.SNOMED_IMPORT_FULL ?? '').trim().toLowerCase() === '1';
	const hardLimit =
		Number(options.limit ?? 0) ||
		Number(process.env.SNOMED_IMPORT_LIMIT ?? 0) ||
		0;
	const dryRun = Boolean(options.dryRun);
	const system = DiagnosisCodingSystemEnum.SNOMED_CT;

	log(
		`[${system}] RF2 concept=${conceptPath} description=${descriptionPath} subset=${full ? 'full' : 'finding+disorder'}`
	);
	const activeConcepts = await loadActiveConceptIds(conceptPath);
	log(`[${system}] active concepts=${activeConcepts.size}`);
	const termMap = await loadDescriptions(
		descriptionPath,
		activeConcepts,
		log
	);
	const rows = buildRows(termMap, releaseId, full, hardLimit);
	log(`[${system}] rows to import=${rows.length}`);

	if (dryRun) {
		log(`[${system}] dry-run sample: ${JSON.stringify(rows.slice(0, 5))}`);
		return {
			system,
			inserted: 0,
			updated: 0,
			total: rows.length,
			releaseId,
			rf2Dir
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
					throw new SnomedRf2ImportError(
						'Missing DATABASE_URL (required unless dry-run).'
					);
				}
				return raw;
			}
		})();
	const sql: SqlClient = neon(databaseUrl);
	const notesPrefix =
		options.notesPrefix?.trim() || 'Imported by snomed-rf2-import';
	const notes = `${notesPrefix} (${new Date().toISOString()}) rf2Dir=${rf2Dir} subset=${full ? 'full' : 'clinical'}`;
	const counts = await upsertDiagnosisCodeRows(
		sql,
		system,
		rows,
		releaseId,
		SNOMED_RF2_SOURCE,
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
		rf2Dir
	};
}
