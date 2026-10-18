/**
 * Neon HTTP batch upsert for RxNorm catalog tables.
 */

import type { NeonQueryFunction } from '@neondatabase/serverless';

export type RxnormConceptUpsertRow = {
	rxcui: string;
	name: string;
	tty: string;
	suppress: string | null;
	normalizedName: string;
	releaseId: string;
};

export type RxnormRelUpsertRow = {
	rxcui1: string;
	rxcui2: string;
	rela: string;
	releaseId: string;
};

export type RxnormNdcUpsertRow = {
	rxcui: string;
	ndc: string;
	releaseId: string;
};

type SqlClient = NeonQueryFunction<false, false>;

function isRetryableDbError(err: unknown): boolean {
	const msg = String((err as { message?: string })?.message || err || '');
	return (
		msg.includes('fetch failed') ||
		msg.includes('Connect Timeout') ||
		msg.includes('ECONNRESET') ||
		msg.includes('ETIMEDOUT') ||
		msg.includes('socket hang up')
	);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDbRetry<T>(
	label: string,
	fn: () => Promise<T>,
	log: (message: string) => void
): Promise<T> {
	const retries = 5;
	let lastErr: unknown;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			if (!isRetryableDbError(err) || attempt === retries) break;
			const waitMs = Math.min(15000, 1000 * 2 ** (attempt - 1));
			log(
				`${label} DB retry ${attempt}/${retries} in ${waitMs}ms: ${(err as Error)?.message || err}`
			);
			await sleep(waitMs);
		}
	}
	throw lastErr;
}

const CONCEPT_BATCH = 400;
const REL_BATCH = 400;
const NDC_BATCH = 400;

export async function upsertRxnormConceptRows(
	sql: SqlClient,
	rows: RxnormConceptUpsertRow[],
	log: (message: string) => void
): Promise<{ inserted: number; updated: number }> {
	let inserted = 0;
	let updated = 0;
	for (let i = 0; i < rows.length; i += CONCEPT_BATCH) {
		const chunk = rows.slice(i, i + CONCEPT_BATCH);
		const rxcuis = chunk.map((r) => r.rxcui);
		const existing = await withDbRetry(
			'rxnormConceptExisting',
			() =>
				sql.query(
					`SELECT rxcui FROM rxnorm_concept WHERE rxcui = ANY($1::text[])`,
					[rxcuis]
				) as Promise<Array<{ rxcui: string }>>,
			log
		);
		const existingSet = new Set(existing.map((e) => e.rxcui));
		for (const row of chunk) {
			if (existingSet.has(row.rxcui)) updated++;
			else inserted++;
		}
		const names = chunk.map((r) => r.name);
		const ttys = chunk.map((r) => r.tty);
		const suppresses = chunk.map((r) => r.suppress);
		const normalized = chunk.map((r) => r.normalizedName);
		const releaseIds = chunk.map((r) => r.releaseId);
		await withDbRetry(
			'rxnormConceptUpsert',
			() =>
				sql.query(
					`INSERT INTO rxnorm_concept (rxcui, name, tty, suppress, normalized_name, release_id)
					 SELECT * FROM UNNEST(
					   $1::varchar[],
					   $2::varchar[],
					   $3::varchar[],
					   $4::varchar[],
					   $5::varchar[],
					   $6::varchar[]
					 )
					 ON CONFLICT (rxcui) DO UPDATE SET
					   name = EXCLUDED.name,
					   tty = EXCLUDED.tty,
					   suppress = EXCLUDED.suppress,
					   normalized_name = EXCLUDED.normalized_name,
					   release_id = EXCLUDED.release_id,
					   updated_at = now()`,
					[rxcuis, names, ttys, suppresses, normalized, releaseIds]
				),
			log
		);
		if (i > 0 && i % 20000 === 0) {
			log(`RxNorm concepts upserted ${i + chunk.length}/${rows.length}`);
		}
	}
	return { inserted, updated };
}

export async function upsertRxnormRelRows(
	sql: SqlClient,
	rows: RxnormRelUpsertRow[],
	log: (message: string) => void
): Promise<number> {
	let total = 0;
	for (let i = 0; i < rows.length; i += REL_BATCH) {
		const chunk = rows.slice(i, i + REL_BATCH);
		const r1 = chunk.map((r) => r.rxcui1);
		const r2 = chunk.map((r) => r.rxcui2);
		const relas = chunk.map((r) => r.rela);
		const releaseIds = chunk.map((r) => r.releaseId);
		await withDbRetry(
			'rxnormRelUpsert',
			() =>
				sql.query(
					`INSERT INTO rxnorm_rel (rxcui1, rxcui2, rela, release_id)
					 SELECT * FROM UNNEST($1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[])
					 ON CONFLICT (rxcui1, rxcui2, rela, release_id) DO NOTHING`,
					[r1, r2, relas, releaseIds]
				),
			log
		);
		total += chunk.length;
	}
	return total;
}

export async function upsertRxnormNdcRows(
	sql: SqlClient,
	rows: RxnormNdcUpsertRow[],
	log: (message: string) => void
): Promise<number> {
	let total = 0;
	for (let i = 0; i < rows.length; i += NDC_BATCH) {
		const chunk = rows.slice(i, i + NDC_BATCH);
		const rxcuis = chunk.map((r) => r.rxcui);
		const ndcs = chunk.map((r) => r.ndc);
		const releaseIds = chunk.map((r) => r.releaseId);
		await withDbRetry(
			'rxnormNdcUpsert',
			() =>
				sql.query(
					`INSERT INTO rxnorm_ndc (rxcui, ndc, release_id)
					 SELECT * FROM UNNEST($1::varchar[], $2::varchar[], $3::varchar[])
					 ON CONFLICT (ndc, release_id) DO NOTHING`,
					[rxcuis, ndcs, releaseIds]
				),
			log
		);
		total += chunk.length;
	}
	return total;
}

export async function recordRxnormRelease(
	sql: SqlClient,
	input: {
		releaseId: string;
		source: string;
		conceptCount: number;
		relCount: number;
		notes?: string;
	},
	log: (message: string) => void
): Promise<void> {
	await withDbRetry(
		'rxnormRelease',
		() =>
			sql.query(
				`INSERT INTO rxnorm_release (release_id, source, concept_count, rel_count, notes)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (source, release_id) DO UPDATE SET
				   concept_count = EXCLUDED.concept_count,
				   rel_count = EXCLUDED.rel_count,
				   notes = EXCLUDED.notes,
				   imported_at = now(),
				   updated_at = now()`,
				[
					input.releaseId,
					input.source,
					input.conceptCount,
					input.relCount,
					input.notes ?? null
				]
			),
		log
	);
}
