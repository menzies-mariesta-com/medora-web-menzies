import type { MenziesTableColumn } from '$lib/component/own/library/menzies/table/MenziesTable.svelte';

function valueAtPath(row: Record<string, unknown>, path: string): unknown {
	const parts = path.split('.');
	let cur: unknown = row;
	for (const part of parts) {
		if (typeof cur !== 'object' || cur === null) return undefined;
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur;
}

function cellDisplayValue<T extends Record<string, unknown>>(
	row: T,
	column: MenziesTableColumn<T>,
	rowIndex: number
): string {
	if (column.format) {
		const raw = column.field
			? valueAtPath(row, column.field)
			: row[column.id];
		const v = column.format(raw, row, rowIndex);
		return v == null ? '' : String(v);
	}
	const path = column.field ?? column.id;
	const value = valueAtPath(row, path);
	return value == null ? '' : String(value);
}

/** Client-side MenziesTable column filters when `useRemoteFilters` is false. */
export function applyMenziesTableClientFilters<
	T extends Record<string, unknown>
>(rows: T[], filters: Record<string, string>, columns: MenziesTableColumn<T>[]): T[] {
	const hasActive = Object.values(filters).some((v) => v?.trim());
	if (!hasActive) return rows;

	return rows.filter((row, index) => {
		for (const column of columns) {
			if (!(column.filterable ?? true)) continue;
			const filterVal = filters[column.id]?.trim() ?? '';
			if (!filterVal) continue;

			const filterType = column.filterType ?? 'text';
			if (filterType === 'select') {
				const path = column.field ?? column.id;
				const raw = valueAtPath(row, path);
				if (String(raw ?? '') !== filterVal) return false;
			} else {
				const display = cellDisplayValue(row, column, index).toLowerCase();
				if (!display.includes(filterVal.toLowerCase())) return false;
			}
		}
		return true;
	});
}
