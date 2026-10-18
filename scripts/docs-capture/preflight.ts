import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { DEFAULT_HOSPITAL_ID, STORAGE_STATE_PATH } from './constants.ts';
import { waitForDevServer } from './wait-dev.ts';
import {
	authErrorFromPage,
	ensureAuthenticated,
	loginSeedAdmin,
	persistStorageState
} from './auth.ts';
import {
	DOCS_DEMO_GRN_INVOICE,
	DOCS_DEMO_WARD_STORE_NAME
} from '../../src/lib/server/db/seed/inventory-docs-demo-seed.ts';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { ensureDatabaseUrl } from '../../src/lib/server/db/ensure-database-url';

async function resolveWardStoreId(hospitalId: string): Promise<number> {
	const db = drizzle(neon(ensureDatabaseUrl()));
	const rows = await db.execute(sql`
		SELECT s.id
		FROM store s
		INNER JOIN hospital_branch hb ON hb.id = s.branch_id
		WHERE hb.hospital_id = ${hospitalId}::uuid
		  AND s.store_name = ${DOCS_DEMO_WARD_STORE_NAME}
		LIMIT 1
	`);
	const list = (rows as { rows?: { id: number }[] }).rows ?? [];
	const id = list[0]?.id;
	if (id == null) {
		throw new Error(
			`Ward store "${DOCS_DEMO_WARD_STORE_NAME}" not found. Run: npm run db:seed:docs-demo`
		);
	}
	return id;
}

function inventoryProbes(wardStoreId: number): { label: string; apiPath: string; minRows: number }[] {
	return [
	{
		label: 'inventory-receipt-from-store',
		apiPath: `/api/medora/hospital/${DEFAULT_HOSPITAL_ID}/home/inventory/department-issue?statusTaggingId=47&toStoreId=${wardStoreId}&page=1&pageSize=5`,
		minRows: 1
	},
	{
		label: 'inventory-department-consumption',
		apiPath: `/api/medora/hospital/${DEFAULT_HOSPITAL_ID}/home/inventory/department-consumption?page=1&pageSize=5`,
		minRows: 1
	},
	{
		label: 'inventory-reports-low-stock',
		apiPath: `/api/medora/hospital/${DEFAULT_HOSPITAL_ID}/home/inventory/reports/low-stock?limit=50`,
		minRows: 1
	},
	{
		label: 'inventory-reports-expired',
		apiPath: `/api/medora/hospital/${DEFAULT_HOSPITAL_ID}/home/inventory/reports/expired?limit=50&mode=expired`,
		minRows: 1
	},
	{
		label: 'inventory-reports-movement',
		apiPath: `/api/medora/hospital/${DEFAULT_HOSPITAL_ID}/home/inventory/reports/movement?limit=50`,
		minRows: 1
	}
];
}

function requireEnv(name: string): string {
	const v = process.env[name]?.trim();
	if (!v) {
		throw new Error(`${name} must be set in .env for docs capture preflight.`);
	}
	return v;
}

async function checkInventorySeedMarker(hospitalId: string): Promise<void> {
	const db = drizzle(neon(ensureDatabaseUrl()));
	const rows = await db.execute(sql`
		SELECT id::text AS id FROM goods_receipt_note
		WHERE hospital_id = ${hospitalId}::uuid
		  AND invoice_no = ${DOCS_DEMO_GRN_INVOICE}
		LIMIT 1
	`);
	const list = (rows as { rows?: { id: string }[] }).rows ?? [];
	if (list.length === 0) {
		throw new Error(
			`Inventory docs demo data missing (no GRN ${DOCS_DEMO_GRN_INVOICE}). Run: npm run db:seed:docs-demo`
		);
	}
}

function countRowsFromPayload(json: unknown, apiPath: string): number {
	if (Array.isArray(json)) return json.length;
	if (json && typeof json === 'object') {
		const o = json as Record<string, unknown>;
		if (Array.isArray(o.data)) return o.data.length;
		if (Array.isArray(o.result)) return o.result.length;
	}
	if (apiPath.includes('department-issue') || apiPath.includes('department-consumption')) {
		const o = json as { data?: unknown[]; total?: number };
		if (typeof o.total === 'number' && o.total > 0) return o.total;
	}
	return 0;
}

async function main() {
	const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4002';
	requireEnv('SEED_ADMIN_EMAIL');
	requireEnv('SEED_ADMIN_PASSWORD');
	requireEnv('DATABASE_URL');

	console.log('docs capture preflight…');
	console.log(`Hospital: ${DEFAULT_HOSPITAL_ID}`);

	await checkInventorySeedMarker(DEFAULT_HOSPITAL_ID);
	const wardStoreId = await resolveWardStoreId(DEFAULT_HOSPITAL_ID);
	const inventoryProbesList = inventoryProbes(wardStoreId);
	await waitForDevServer(baseURL);

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		baseURL,
		storageState: existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined
	});
	const page = await context.newPage();
	await page.goto('/medora', { waitUntil: 'domcontentloaded' });
	if (authErrorFromPage(page)) {
		await loginSeedAdmin(page, context);
	}
	await persistStorageState(context);
	await ensureAuthenticated(page, context);

	for (const probe of inventoryProbesList) {
		const res = await context.request.get(probe.apiPath);
		if (!res.ok()) {
			throw new Error(
				`${probe.label}: API ${probe.apiPath} returned HTTP ${res.status()}. Check login and hospital access.`
			);
		}
		const json = await res.json().catch(() => null);
		const n = countRowsFromPayload(json, probe.apiPath);
		if (n < probe.minRows) {
			throw new Error(
				`${probe.label}: expected at least ${probe.minRows} row(s), got ${n}. Run: npm run db:seed:docs-demo`
			);
		}
		console.log(`  ok: ${probe.label} (${n} row(s))`);
	}

	await browser.close();
	console.log('docs capture preflight passed.');
}

main().catch((err) => {
	console.error('docs capture preflight failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
