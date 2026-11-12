import { formatTimelineDurationHours } from '$lib/util/timeline-duration-days.util';

/** SearchSelect option from timeline unit-master. */
export type TimelineUnitSearchOption = { value: string; label: string };

export function unitMasterApi(hospitalId: string): string {
	return `/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/inventory-setup/unit-master`;
}

export function formatTimelineUnitSearchLabel(row: {
	name?: string | null;
	timelineDurationDays?: string | null;
}): string {
	const name = row.name?.trim() ?? '';
	const dur = formatTimelineDurationHours(row.timelineDurationDays);
	if (dur && name) return `${name} · ${dur}h`;
	if (name) return name;
	return dur ? `· ${dur}h` : '';
}

export async function searchTimelineUnitOptions(
	hospitalId: string,
	query: string
): Promise<TimelineUnitSearchOption[]> {
	if (!hospitalId) return [];
	const qs = new URLSearchParams({
		mode: 'timeline',
		page: '1',
		pageSize: '20',
		search: query.trim()
	});
	const res = await fetch(`${unitMasterApi(hospitalId)}?${qs}`, {
		credentials: 'include'
	});
	if (!res.ok) return [];
	const pack = (await res.json()) as {
		data?: Array<{
			id: number;
			name: string | null;
			timelineDurationDays?: string | null;
		}>;
	};
	return (pack.data ?? []).map((row) => ({
		value: String(row.id),
		label: formatTimelineUnitSearchLabel(row)
	}));
}

/** Resolve display label for a selected timeline unit id. */
export async function labelForTimelineUnitId(input: {
	hospitalId: string;
	value: string;
	/** Prefer this when it still matches the selected id. */
	cached?: { id: string; label: string } | null;
}): Promise<string> {
	const { hospitalId, value, cached } = input;
	if (!value || !hospitalId) return '';
	if (cached?.label && cached.id === value) return cached.label;
	const res = await fetch(
		`${unitMasterApi(hospitalId)}?id=${encodeURIComponent(value)}`,
		{ credentials: 'include' }
	);
	if (!res.ok) return '';
	const row = (await res.json()) as {
		name?: string | null;
		timelineDurationDays?: string | null;
	};
	return formatTimelineUnitSearchLabel(row);
}
