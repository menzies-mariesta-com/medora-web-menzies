import type { ItemNamePriceRow } from '$lib/model/type/medora/medication-order.type';
import { formatMedOrderItemSearchLabel } from '$lib/tool/medication-order/format-med-order-item-search-label.util';

export type MedOrderSearchOption = { value: string; label: string };

export async function searchMedOrderStoreOptions(
	apiRoot: string,
	query: string
): Promise<MedOrderSearchOption[]> {
	if (!apiRoot) return [];
	const u = new URL(apiRoot, window.location.origin);
	u.searchParams.set('mode', 'stores.search');
	if (query.trim()) u.searchParams.set('name', query.trim());
	const res = await fetch(u, { credentials: 'include' });
	if (!res.ok) return [];
	const rows = (await res.json()) as {
		id: number;
		storeName: string | null;
	}[];
	return rows.map((s) => ({
		value: String(s.id),
		label: s.storeName?.trim() || `Store #${s.id}`
	}));
}

export async function resolveMedOrderStoreLabel(
	apiRoot: string,
	idStr: string
): Promise<string> {
	if (!idStr || !apiRoot) return '';
	const u = new URL(apiRoot, window.location.origin);
	u.searchParams.set('mode', 'stores.search');
	const res = await fetch(u, { credentials: 'include' });
	if (!res.ok) return `Store #${idStr}`;
	const rows = (await res.json()) as {
		id: number;
		storeName: string | null;
	}[];
	const hit = rows.find((r) => String(r.id) === idStr);
	return hit
		? hit.storeName?.trim() || `#${hit.id}`
		: `Store #${idStr}`;
}

export async function searchMedOrderItemOptions(input: {
	apiRoot: string;
	storeId: number;
	query: string;
	pharmacyGenericId?: string;
}): Promise<{ options: MedOrderSearchOption[]; rows: ItemNamePriceRow[] }> {
	const { apiRoot, storeId, query, pharmacyGenericId } = input;
	if (!apiRoot || !storeId) return { options: [], rows: [] };
	const u = new URL(apiRoot, window.location.origin);
	u.searchParams.set('mode', 'items.search');
	u.searchParams.set('storeId', String(storeId));
	if (query.trim()) u.searchParams.set('search', query.trim());
	if (pharmacyGenericId) {
		u.searchParams.set('pharmacyGenericId', pharmacyGenericId);
	}
	const res = await fetch(u, { credentials: 'include' });
	if (!res.ok) return { options: [], rows: [] };
	const rows = (await res.json()) as ItemNamePriceRow[];
	return {
		rows,
		options: rows.map((it) => ({
			value: String(it.id),
			label: formatMedOrderItemSearchLabel(it)
		}))
	};
}

export async function labelForMedOrderItemId(input: {
	hospitalId: string;
	idStr: string;
	fromSearch?: ItemNamePriceRow | null;
	selectedItem?: ItemNamePriceRow | null;
}): Promise<string> {
	const { hospitalId, idStr, fromSearch, selectedItem } = input;
	if (!idStr) return '';
	if (fromSearch) return formatMedOrderItemSearchLabel(fromSearch);
	if (selectedItem && String(selectedItem.id) === idStr) {
		return formatMedOrderItemSearchLabel(selectedItem);
	}
	if (!hospitalId) return `Item #${idStr}`;
	const res = await fetch(
		`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/item-master?id=${encodeURIComponent(idStr)}`,
		{ credentials: 'include' }
	);
	if (!res.ok) return `Item #${idStr}`;
	const d = (await res.json()) as { itemName?: string | null };
	return d.itemName?.trim() || `Item #${idStr}`;
}
