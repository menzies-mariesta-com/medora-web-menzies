import type { BrowserContext } from '@playwright/test';
import { DEFAULT_HOSPITAL_ID } from './constants.ts';
import { DOCS_DEMO_WARD_STORE_NAME } from '../../src/lib/server/db/seed/inventory-docs-demo-seed.ts';

/** Inventory list pages that receive into the ward store (receipt from store). */
export function slugUsesWardReceivingStore(slug: string): boolean {
	return slug === 'inventory-receipt-from-store';
}

export function pathIsInventoryOps(appPath: string): boolean {
	const base = `/medora/hospital/${DEFAULT_HOSPITAL_ID}/home/inventory`;
	if (!appPath.startsWith(base)) return false;
	return !appPath.includes('inventory-setup');
}

/**
 * Sets `heka_selected_inventory_from_store_id` via layout POST so list APIs scope correctly.
 */
export async function ensureInventoryFromStoreCookie(
	context: BrowserContext,
	options: { wardReceivingStore?: boolean } = {}
): Promise<void> {
	const hospitalId = DEFAULT_HOSPITAL_ID;
	const storesRes = await context.request.get(
		`/api/medora/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`
	);
	if (!storesRes.ok()) {
		console.warn(
			`docs capture: could not load stores for From store cookie (HTTP ${storesRes.status()})`
		);
		return;
	}
	const stores = (await storesRes.json()) as {
		id: number;
		storeName: string | null;
	}[];
	if (!Array.isArray(stores) || stores.length === 0) return;

	let storeId: number | undefined;
	if (options.wardReceivingStore) {
		const ward = stores.find((s) => s.storeName === DOCS_DEMO_WARD_STORE_NAME);
		storeId = ward?.id ?? stores[0]?.id;
	} else {
		storeId = stores[0]?.id;
	}
	if (storeId == null) return;

	await context.request.post(
		`/medora/hospital/${hospitalId}/home/set-selected-inventory-from-store`,
		{
			form: { storeId: String(storeId) },
			maxRedirects: 0
		}
	);
}
