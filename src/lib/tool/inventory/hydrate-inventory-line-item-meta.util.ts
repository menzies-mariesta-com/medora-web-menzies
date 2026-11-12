/** IUM row shape used by PR / indent / consumption / issue line forms. */
export type InventoryLineIumOpt = {
	id: number;
	conversionDisplay: string;
	purchaseUnitId?: number;
	issueUnitId?: number;
	purchaseConversionFactor?: string;
	issueConversionFactor?: string;
	issueUnitName?: string;
	[key: string]: unknown;
};

export type HydratedInventoryLineItemMeta<T extends InventoryLineIumOpt> = {
	itemLabel: string;
	iumList: T[];
	itemUnitMasterId: number | null;
};

/**
 * Load item name + allowed IUMs for a line editor.
 * `iumMode: 'allAllowed'` keeps every allowed IUM; `defaultOnly` keeps the default (or first).
 */
export async function hydrateInventoryLineItemMeta<
	T extends InventoryLineIumOpt
>(input: {
	hospitalId: string;
	itemId: number;
	iumMode?: 'allAllowed' | 'defaultOnly';
}): Promise<HydratedInventoryLineItemMeta<T> | null> {
	const { hospitalId, itemId, iumMode = 'allAllowed' } = input;
	if (!hospitalId || !Number.isFinite(itemId) || itemId <= 0) return null;
	const base = `/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/item-master`;
	const [detailRes, iumRes] = await Promise.all([
		fetch(`${base}?id=${itemId}`, { method: 'GET', credentials: 'include' }),
		fetch(`${base}?mode=itemUnitMasters`, {
			method: 'GET',
			credentials: 'include'
		})
	]);
	if (!detailRes.ok || !iumRes.ok) return null;
	const detail = (await detailRes.json()) as {
		itemName?: string | null;
		itemUnitMasterIds?: number[];
		defaultItemUnitMasterId?: number | null;
	};
	const allIum = (await iumRes.json()) as T[];
	const allowed = new Set(detail.itemUnitMasterIds ?? []);
	const allowedRows = allIum.filter((u) => allowed.has(u.id));
	const def = detail.defaultItemUnitMasterId;
	const itemLabel = detail.itemName ?? '—';

	if (iumMode === 'defaultOnly') {
		let chosen: T | undefined =
			def != null ? allowedRows.find((u) => u.id === def) : undefined;
		if (!chosen && allowedRows.length > 0) chosen = allowedRows[0];
		return {
			itemLabel,
			iumList: chosen ? [chosen] : [],
			itemUnitMasterId: chosen?.id ?? null
		};
	}

	const itemUnitMasterId =
		def != null && allowedRows.some((u) => u.id === def)
			? def
			: (allowedRows[0]?.id ?? null);
	return {
		itemLabel,
		iumList: allowedRows,
		itemUnitMasterId
	};
}
