/** Select option shape for MariTable column filters. */
export type MariSelectFilterOption = { value: string; label: string };

export type MariTableFilterMasterKey =
	| 'store'
	| 'supplier'
	| 'severity'
	| 'itemCategory'
	| 'unitType'
	| 'visitType';

async function parseJson<T>(res: Response): Promise<T> {
	if (!res.ok) {
		throw new Error(`Request failed (${res.status})`);
	}
	return (await res.json()) as T;
}

function sortByLabel(
	options: MariSelectFilterOption[]
): MariSelectFilterOption[] {
	return [...options].sort((a, b) => a.label.localeCompare(b.label));
}

/** Store master (all hospital stores), not scoped to current table rows. */
export async function fetchStoreMasterFilterOptions(
	hospitalId: string,
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	const res = await fetch(
		`/api/heka/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/stores?mode=allForPicker`,
		{ signal }
	);
	const rows = await parseJson<
		{ id: number; storeName: string | null }[]
	>(res);
	return sortByLabel(
		rows.map((s) => ({
			value: String(s.id),
			label: s.storeName?.trim() || `Store ${s.id}`
		}))
	);
}

/** Supplier master for the hospital. */
export async function fetchSupplierMasterFilterOptions(
	hospitalId: string,
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	const res = await fetch(
		`/api/heka/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/supplier-setup?mode=allForPicker`,
		{ signal }
	);
	const rows = await parseJson<{ id: number; name: string | null }[]>(res);
	return sortByLabel(
		rows.map((s) => ({
			value: String(s.id),
			label: s.name?.trim() || `Supplier ${s.id}`
		}))
	);
}

/** Global severity master (allergy / clinical). */
export async function fetchSeverityMasterFilterOptions(
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	const res = await fetch('/api/heka/master/lookup?kind=severity', {
		signal
	});
	const rows = await parseJson<{ id: number; name: string | null }[]>(res);
	return sortByLabel(
		rows.map((s) => ({
			value: s.name?.trim() ?? String(s.id),
			label: s.name?.trim() || `Severity ${s.id}`
		}))
	);
}

/** Inventory item-master categories (supply types). */
export async function fetchItemCategoryMasterFilterOptions(
	hospitalId: string,
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	const res = await fetch(
		`/api/heka/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/item-master?mode=categories`,
		{ signal }
	);
	const rows = await parseJson<
		{ id: number; categoryName: string | null }[]
	>(res);
	return sortByLabel(
		rows.map((c) => ({
			value: String(c.id),
			label: c.categoryName?.trim() || `Category ${c.id}`
		}))
	);
}

/** Unit types for unit-master filters. */
export async function fetchUnitTypeMasterFilterOptions(
	hospitalId: string,
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	const res = await fetch(
		`/api/heka/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/unit-master?mode=unitTypes`,
		{ signal }
	);
	const rows = await parseJson<{ id: number; name: string | null }[]>(res);
	return sortByLabel(
		rows.map((ut) => ({
			value: String(ut.id),
			label: ut.name?.trim() || `Type ${ut.id}`
		}))
	);
}

/** Visit types for EMR visit list filters. */
export async function fetchVisitTypeMasterFilterOptions(
	hospitalId: string,
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	const res = await fetch(
		`/api/heka/hospital/${encodeURIComponent(hospitalId)}/home/emr/visit-list?${new URLSearchParams({ mode: 'visitType.list' })}`,
		{ signal }
	);
	const rows = await parseJson<{ id: number; name: string | null }[]>(res);
	return sortByLabel(
		rows.map((vt) => ({
			value: String(vt.id),
			label: vt.name?.trim() || `Type ${vt.id}`
		}))
	);
}

export async function fetchMariTableMasterFilterOptions(
	key: MariTableFilterMasterKey,
	hospitalId: string | undefined,
	signal?: AbortSignal
): Promise<MariSelectFilterOption[]> {
	switch (key) {
		case 'store':
			if (!hospitalId?.trim()) return [];
			return fetchStoreMasterFilterOptions(hospitalId.trim(), signal);
		case 'supplier':
			if (!hospitalId?.trim()) return [];
			return fetchSupplierMasterFilterOptions(hospitalId.trim(), signal);
		case 'severity':
			return fetchSeverityMasterFilterOptions(signal);
		case 'itemCategory':
			if (!hospitalId?.trim()) return [];
			return fetchItemCategoryMasterFilterOptions(
				hospitalId.trim(),
				signal
			);
		case 'unitType':
			if (!hospitalId?.trim()) return [];
			return fetchUnitTypeMasterFilterOptions(hospitalId.trim(), signal);
		case 'visitType':
			if (!hospitalId?.trim()) return [];
			return fetchVisitTypeMasterFilterOptions(hospitalId.trim(), signal);
	}
}
