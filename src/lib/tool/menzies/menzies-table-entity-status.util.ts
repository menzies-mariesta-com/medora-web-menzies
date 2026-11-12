import type { MenziesTableColumn } from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
import { StatusEnum } from '$lib/model/enum/db-link';

export function parseMenziesTableEntityStatusId(
	filters: Record<string, string>,
	columnId = 'status'
): number | undefined {
	const raw = filters[columnId]?.trim();
	if (!raw) return undefined;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
}

export function appendEntityStatusIdSearchParam(
	sp: URLSearchParams,
	filters: Record<string, string>,
	columnId = 'status'
): void {
	const statusId = parseMenziesTableEntityStatusId(filters, columnId);
	if (statusId != null) sp.set('statusId', String(statusId));
}

export function activeInactiveEntityStatusColumn<T>(
	options: {
		header: string;
		widthClass?: string;
		field?: string;
		activeLabel?: string;
		inactiveLabel?: string;
	} 
): MenziesTableColumn<T> {
	const activeLabel = options.activeLabel ?? 'Active';
	const inactiveLabel = options.inactiveLabel ?? 'Inactive';
	return {
		id: 'status',
		header: options.header,
		widthClass: options.widthClass ?? 'w-40 min-w-[10rem]',
		filterable: true,
		filterType: 'select',
		filterOptions: [
			{ label: activeLabel, value: String(StatusEnum.ACTIVE) },
			{ label: inactiveLabel, value: String(StatusEnum.INACTIVE) }
		],
		defaultFilterValue: String(StatusEnum.ACTIVE),
		field: options.field ?? 'status.name',
		format: (_value, row) => {
			const statusId = (row as { statusId?: number | null }).statusId;
			if (statusId === StatusEnum.ACTIVE) return activeLabel;
			if (statusId === StatusEnum.INACTIVE) return inactiveLabel;
			return statusId != null ? String(statusId) : '—';
		}
	};
}
