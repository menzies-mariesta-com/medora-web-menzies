/**
 * Fetches aggregated on-hand quantity per item at a store (issue unit label when available).
 * Used by inventory line editors; calls the mirrored stock API only.
 */
export async function fetchStockLabelsForItemsAtStore(
	hospitalId: string,
	storeId: number,
	itemIds: number[]
): Promise<Map<number, string>> {
	const out = new Map<number, string>();
	const uniq = [...new Set(itemIds.filter((n) => Number.isFinite(n) && n > 0))].slice(0, 150);
	if (!hospitalId || uniq.length === 0) return out;
	const sp = new URLSearchParams();
	sp.set('mode', 'aggregated');
	sp.set('storeId', String(storeId));
	sp.set('itemIds', uniq.join(','));
	const res = await fetch(
		`/api/heka/hospital/${hospitalId}/home/inventory/stock?${sp.toString()}`
	);
	if (!res.ok) return out;
	const rows = (await res.json()) as {
		itemId: number;
		totalQty: string;
		issueUnitName?: string | null;
	}[];
	for (const id of uniq) {
		const row = rows.find((r) => r.itemId === id);
		const qty = row?.totalQty?.trim() ?? '0';
		const u = row?.issueUnitName?.trim();
		out.set(id, u ? `${qty} ${u}` : qty);
	}
	return out;
}

/**
 * Appends on-hand at **selectedStoreId** only to item search option labels (DaisyUISearchSelect).
 */
export async function enrichItemSearchOptionsWithStock(
	hospitalId: string,
	options: { label: string; value: string }[],
	selectedStoreId: number | null
): Promise<{ label: string; value: string }[]> {
	if (!hospitalId || options.length === 0) return options;
	const ids = options
		.map((o) => Number(o.value))
		.filter((n) => Number.isFinite(n) && n > 0);
	if (ids.length === 0) return options;
	const uniq = [...new Set(ids)];
	const hasSel = selectedStoreId != null && Number.isFinite(selectedStoreId);
	if (!hasSel) return options;
	const mapSel = await fetchStockLabelsForItemsAtStore(
		hospitalId,
		selectedStoreId!,
		uniq
	);
	return options.map((o) => {
		const id = Number(o.value);
		if (!Number.isFinite(id) || id <= 0) return o;
		const parts: string[] = [o.label.trim() || '—'];
		parts.push(mapSel.get(id) ?? '0');
		return { value: o.value, label: parts.join(' · ') };
	});
}
