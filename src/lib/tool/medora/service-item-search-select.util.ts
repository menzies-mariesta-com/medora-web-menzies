/** SearchSelect option from service-item-master. */
export type ServiceItemSearchOption = { value: string; label: string };

export function serviceItemMasterApi(hospitalId: string): string {
	return `/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/administration/service-order/service-item-master`;
}

export function formatServiceItemSearchLabel(row: {
	serviceName: string | null;
	serviceCode: string | null;
}): string {
	return [row.serviceName, row.serviceCode ? `(${row.serviceCode})` : '']
		.filter(Boolean)
		.join(' ');
}

export async function searchServiceItemOptions(
	hospitalId: string,
	query: string
): Promise<ServiceItemSearchOption[]> {
	if (!hospitalId) return [];
	const qs = new URLSearchParams({
		mode: 'paginated',
		page: '1',
		pageSize: '20',
		serviceName: query.trim()
	});
	const res = await fetch(`${serviceItemMasterApi(hospitalId)}?${qs}`, {
		credentials: 'include'
	});
	if (!res.ok) return [];
	const pack = (await res.json()) as {
		data?: Array<{
			id: number;
			serviceName: string | null;
			serviceCode: string | null;
		}>;
	};
	return (pack.data ?? []).map((row) => ({
		value: String(row.id),
		label: formatServiceItemSearchLabel(row)
	}));
}

/** Resolve display name for a selected service item id. */
export async function labelForServiceItemId(input: {
	hospitalId: string;
	value: string;
	/** Prefer this when it still matches the selected id. */
	cached?: { id: string; label: string } | null;
}): Promise<string> {
	const { hospitalId, value, cached } = input;
	if (!value || !hospitalId) return '';
	if (cached?.label && cached.id === value) return cached.label;
	const qs = new URLSearchParams({ mode: 'all', id: value });
	const res = await fetch(`${serviceItemMasterApi(hospitalId)}?${qs}`, {
		credentials: 'include'
	});
	if (!res.ok) return '';
	const rows = (await res.json()) as Array<{ serviceName: string | null }>;
	return rows[0]?.serviceName?.trim() ?? '';
}
