/**
 * One-shot demo data for workflow documentation capture (Testing Hospital 1).
 *
 * Prerequisites: hospital exists with at least one active branch.
 * Env: DATABASE_URL, optional SEED_HOSPITAL_ID / DOCS_DEMO_HOSPITAL_ID
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { execSync } from 'node:child_process';
import { seedLogger } from '$lib/logger';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import { seedVisitHistoryDemo } from './visit-history-demo-seed';
import { seedInventoryDocsDemo } from './inventory-docs-demo-seed';

const DEFAULT_DOCS_DEMO_HOSPITAL_ID = '01a0cd12-1af6-7839-a4ce-6d834497a0ba';

const db = drizzle(neon(ensureDatabaseUrl()));

type QueryRows<T> = { rows: T[] };

function rowsOf<T>(result: unknown): T[] {
	const r = result as QueryRows<T>;
	return Array.isArray(r?.rows) ? r.rows : [];
}

type HospitalRow = { id: string; name: string | null; code: string | null };

function formatDbError(err: unknown): string {
	if (!(err instanceof Error)) return String(err);
	const parts = [err.message];
	const cause = (err as Error & { cause?: unknown }).cause;
	if (cause instanceof Error) parts.push(cause.message);
	else if (cause != null) parts.push(String(cause));
	return parts.filter(Boolean).join(' | ');
}

async function executeWithRetry<T>(
	label: string,
	run: () => Promise<T>,
	attempts = 3
): Promise<T> {
	let last: unknown;
	for (let i = 0; i < attempts; i++) {
		try {
			return await run();
		} catch (err) {
			last = err;
			if (i < attempts - 1) {
				const delayMs = 500 * (i + 1);
				seedLogger.warn(
					`${label} failed (attempt ${i + 1}/${attempts}), retrying in ${delayMs}ms: ${formatDbError(err)}`
				);
				await new Promise((r) => setTimeout(r, delayMs));
			}
		}
	}
	throw last instanceof Error
		? new Error(`${label}: ${formatDbError(last)}`, { cause: last })
		: new Error(`${label}: ${String(last)}`);
}

function resolveHospitalId(): string {
	return (
		process.env.SEED_HOSPITAL_ID?.trim() ||
		process.env.DOCS_DEMO_HOSPITAL_ID?.trim() ||
		DEFAULT_DOCS_DEMO_HOSPITAL_ID
	);
}

async function validateHospital(hospitalId: string): Promise<HospitalRow> {
	const rows = rowsOf<HospitalRow>(
		await executeWithRetry('validateHospital lookup', () =>
			db.execute(sql`
				SELECT id::text AS id, name, code
				FROM hospital
				WHERE id = ${hospitalId}::uuid AND status_id = 1
				LIMIT 1
			`)
		)
	);
	const row = rows[0];
	if (!row?.id) {
		throw new Error(
			`Hospital ${hospitalId} not found or inactive. Create Testing Hospital 1 in Medora first.`
		);
	}

	const branchCount = rowsOf<{ n: number }>(
		await executeWithRetry('validateHospital branch count', () =>
			db.execute(sql`
				SELECT COUNT(*)::int AS n
				FROM hospital_branch
				WHERE hospital_id = ${hospitalId}::uuid AND status_id = 1
			`)
		)
	)[0]?.n;

	if (!branchCount) {
		throw new Error(
			`Hospital "${row.name ?? row.code ?? hospitalId}" has no active branches. Add a branch in Administration before seeding.`
		);
	}

	return row;
}

/** Env for nested npm seeds (docs capture does not require live WHO ICD-API). */
function seedChildEnv(
	hospitalId: string,
	extraEnv: Record<string, string> = {}
): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {
		...process.env,
		SEED_HOSPITAL_ID: hospitalId,
		...extraEnv
	};
	// Unless you explicitly set WHO_ICD_SKIP_SEED=0, skip WHO token/import (often blocked offline).
	if (process.env.WHO_ICD_SKIP_SEED?.trim() !== '0') {
		env.WHO_ICD_SKIP_SEED = '1';
	}
	return env;
}

function runNpmScript(script: string, hospitalId: string, extraEnv: Record<string, string> = {}) {
	seedLogger.info(`Running npm run ${script}…`);
	if (script === 'db:seed' && process.env.WHO_ICD_SKIP_SEED?.trim() !== '0') {
		seedLogger.info(
			'Skipping WHO ICD import during global seed (WHO_ICD_SKIP_SEED=1). Set WHO_ICD_SKIP_SEED=0 to import from WHO ICD-API.'
		);
	}
	execSync(`npm run ${script}`, {
		stdio: 'inherit',
		env: seedChildEnv(hospitalId, extraEnv)
	});
}

async function main() {
	const hospitalId = resolveHospitalId();
	const hospital = await validateHospital(hospitalId);
	seedLogger.info(
		`Docs demo seed target: ${hospital.name ?? hospital.code ?? hospitalId} (${hospitalId})`
	);

	const skipGlobal = process.env.DOCS_DEMO_SKIP_GLOBAL === '1';
	if (!skipGlobal) {
		runNpmScript('db:seed', hospitalId);
	} else {
		seedLogger.info('Skipping global db:seed (DOCS_DEMO_SKIP_GLOBAL=1)');
	}

	process.env.SEED_HOSPITAL_ID = hospitalId;
	await seedVisitHistoryDemo();

	runNpmScript('db:seed:transaction', hospitalId, {
		SEED_TRANSACTION_ROW_COUNT: process.env.SEED_TRANSACTION_ROW_COUNT ?? '50'
	});

	if (process.env.DOCS_DEMO_SKIP_INVENTORY !== '1') {
		await seedInventoryDocsDemo();
	} else {
		seedLogger.info('Skipping inventory docs demo (DOCS_DEMO_SKIP_INVENTORY=1)');
	}

	seedLogger.info('Docs demo hospital seed finished.');
}

main().catch((err) => {
	const message = formatDbError(err);
	seedLogger.error(
		'Docs demo hospital seed failed',
		err instanceof Error ? err : new Error(message)
	);
	if (message.includes('Failed query') && !message.includes('not found')) {
		seedLogger.error(
			'Neon HTTP may have dropped the connection. Retry npm run db:seed:docs-demo; check DATABASE_URL and network.'
		);
	}
	process.exit(1);
});
