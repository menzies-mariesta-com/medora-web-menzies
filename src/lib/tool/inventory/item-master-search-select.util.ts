import { AppEnum } from '$lib/model/enum/app.enum';

export type ItemMasterSearchOption = { label: string; value: string };

/** SearchSelect options from inventory item-master by name. */
export async function searchItemMasterOptions(
	hospitalId: string,
	query: string
): Promise<ItemMasterSearchOption[]> {
	if (!hospitalId) return [];
	const qEnc = encodeURIComponent(query.trim());
	const res = await fetch(
		`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`,
		{ credentials: 'include' }
	);
	if (!res.ok) return [];
	const j = (await res.json()) as {
		data?: Array<{ itemName?: string | null; id: number }>;
	};
	return (j.data ?? []).map((x) => ({
		label: x.itemName ?? '—',
		value: String(x.id)
	}));
}
