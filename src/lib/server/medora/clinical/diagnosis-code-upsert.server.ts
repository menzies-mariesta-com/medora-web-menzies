/**
 * Shared Neon HTTP upsert for `diagnosis_code` + `diagnosis_code_release`.
 * Used by WHO ICD-API and CDC ICD-10-CM importers.
 */

import type { NeonQueryFunction } from '@neondatabase/serverless';
import { StatusEnum } from '$lib/model/enum/db-link';

export type DiagnosisCodeUpsertRow = {
	code: string;
	description: string;
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

async function loadExistingCodes(
	sql: SqlClient,
	system: string,
	codes: string[],
	log: (message: string) => void
): Promise<Set<string>> {
	const existing = new Set<string>();
	const chunkSize = 500;
	for (let i = 0; i < codes.length; i += chunkSize) {
		const chunk = codes.slice(i, i + chunkSize);
		const rows = await withDbRetry(
			`loadExistingCodes[${system}]`,
			() =>
				sql.query(
					`SELECT code FROM diagnosis_code
					 WHERE system = $1 AND code = ANY($2::text[])`,
					[system, chunk]
				) as Promise<Array<{ code: string }>>,
			log
		);
		for (const row of rows) {
			existing.add(row.code);
		}
	}
	return existing;
}

/**
 * Upsert catalogue rows by (system, code). Does not truncate.
 * Writes / updates matching `diagnosis_code_release` metadata.
 */
export async function upsertDiagnosisCodeRows(
	sql: SqlClient,
	system: string,
	rows: DiagnosisCodeUpsertRow[],
	releaseId: string,
	source: string,
	notes: string,
	log: (message: string) => void = console.log
): Promise<{ inserted: number; updated: number; total: number }> {
	if (rows.length === 0) {
		return { inserted: 0, updated: 0, total: 0 };
	}

	const existing = await loadExistingCodes(
		sql,
		system,
		rows.map((r) => r.code),
		log
	);
	let inserted = 0;
	let updated = 0;
	for (const row of rows) {
		if (existing.has(row.code)) updated += 1;
		else inserted += 1;
	}

	const chunkSize = 100;
	let upserted = 0;
	for (let i = 0; i < rows.length; i += chunkSize) {
		const chunk = rows.slice(i, i + chunkSize);
		const params: unknown[] = [];
		const placeholders = chunk
			.map((r, idx) => {
				const base = idx * 5;
				params.push(
					r.code,
					system,
					r.description,
					r.releaseId,
					StatusEnum.ACTIVE
				);
				return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
			})
			.join(', ');
		await withDbRetry(
			`upsertRows[${system}]`,
			() =>
				sql.query(
					`INSERT INTO diagnosis_code (code, system, description, release_id, status_id)
					 VALUES ${placeholders}
					 ON CONFLICT (system, code) DO UPDATE SET
					   description = EXCLUDED.description,
					   release_id = EXCLUDED.release_id,
					   status_id = EXCLUDED.status_id,
					   updated_at = now()`,
					params
				),
			log
		);
		upserted += chunk.length;
		if (upserted % 500 === 0 || upserted === rows.length) {
			log(`[${system}] upsert progress ${upserted}/${rows.length}`);
		}
	}

	await withDbRetry(
		`upsertRelease[${system}]`,
		() =>
			sql.query(
				`INSERT INTO diagnosis_code_release (
					system, release_id, source, title_count, imported_at, notes
				)
				VALUES ($1, $2, $3, $4, now(), $5)
				ON CONFLICT (system, release_id) DO UPDATE SET
					title_count = EXCLUDED.title_count,
					imported_at = EXCLUDED.imported_at,
					notes = EXCLUDED.notes,
					source = EXCLUDED.source,
					updated_at = now()`,
				[system, releaseId, source, rows.length, notes]
			),
		log
	);

	return { inserted, updated, total: rows.length };
}
