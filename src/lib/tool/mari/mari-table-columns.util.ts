import type { MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';

const ROW_NUMBER_COLUMN_IDS = new Set([
	'no',
	'idx',
	'#',
	'rowNo',
	'row_no',
	'index'
]);

/** Display fields that must never be stripped as identifiers. */
const NEVER_STRIP_FIELDS = new Set([
	'visitNo',
	'createdByName',
	'updatedByName',
	'approvedByName',
	'cancelledByName',
	'receivedByName'
]);

/** Raw identifier fields removed from MariTable; map to human-readable column. */
const STRIP_IDENTIFIER_FIELDS = new Set([
	'id',
	'hospitalId',
	'visitId',
	'patientId',
	'createdBy',
	'updatedBy',
	'itemMasterId',
	'batchId',
	'staffId',
	'userId'
]);

const REPLACEMENT_FOR_STRIPPED_FIELD: Record<
	string,
	{ id: string; field: string; header: string }
> = {
	visitId: { id: 'visitNo', field: 'visitNo', header: 'Visit no.' },
	createdBy: {
		id: 'createdByName',
		field: 'createdByName',
		header: 'Created by'
	},
	updatedBy: {
		id: 'updatedByName',
		field: 'updatedByName',
		header: 'Updated by'
	}
};

function columnUsesField(
	columns: MariTableColumn[],
	field: string
): boolean {
	return columns.some((c) => (c.field ?? c.id) === field);
}

function headerImpliesIdentifier(header: unknown): boolean {
	const h = String(header ?? '').trim().toLowerCase();
	if (!h) return false;
	if (h === 'id') return true;
	if (h.endsWith(' id')) return true;
	if (h.includes('_id')) return true;
	if (h.includes('(user id)')) return true;
	return /\bid\b/.test(h) && !h.includes('valid') && !h.includes('grid');
}

export function isMariTableRowNumberColumn(col: MariTableColumn): boolean {
	const h = String(col.header ?? '').trim();
	if (h === 'No.' || h === 'No' || h === '#') return true;
	if (ROW_NUMBER_COLUMN_IDS.has(col.id)) return true;
	if (col.id === 'id' && h === 'No.') return true;
	if (col.id === 'serviceId' && h === 'No.' && col.format != null) return true;
	return false;
}

export function isMariTableDatabaseIdColumn(col: MariTableColumn): boolean {
	if (isMariTableRowNumberColumn(col)) return false;
	const field = col.field ?? col.id;
	if (NEVER_STRIP_FIELDS.has(field) || NEVER_STRIP_FIELDS.has(col.id)) {
		return false;
	}
	if (STRIP_IDENTIFIER_FIELDS.has(field) || STRIP_IDENTIFIER_FIELDS.has(col.id)) {
		return true;
	}
	if (headerImpliesIdentifier(col.header)) return true;
	return false;
}

function replacementColumnForStripped(
	stripped: MariTableColumn
): MariTableColumn | null {
	const field = stripped.field ?? stripped.id;
	const spec = REPLACEMENT_FOR_STRIPPED_FIELD[field];
	if (!spec) return null;
	return {
		id: spec.id,
		header: spec.header,
		field: spec.field,
		filterable: stripped.filterable ?? true,
		widthClass: stripped.widthClass,
		format: (value) =>
			value != null && String(value).trim() ? String(value).trim() : '—'
	};
}

export function mariTableRowNoColumn(options: {
	currentPage: number;
	pageSize: number;
}): MariTableColumn {
	const { currentPage, pageSize } = options;
	return {
		id: 'no',
		header: 'No.',
		widthClass: 'w-16 min-w-[4rem]',
		filterable: false,
		format: (_value, _row, rowIndex) =>
			(currentPage - 1) * pageSize + rowIndex + 1
	};
}

function standardizeRowNumberColumn(
	col: MariTableColumn,
	options: { currentPage: number; pageSize: number }
): MariTableColumn {
	return {
		...col,
		id: 'no',
		header: 'No.',
		filterable: false,
		widthClass: col.widthClass ?? 'w-16 min-w-[4rem]',
		format:
			col.format ??
			((_value, _row, rowIndex) =>
				(options.currentPage - 1) * options.pageSize + rowIndex + 1)
	};
}

/**
 * Ensures every MariTable has a leading "No." column, strips raw identifier columns,
 * and swaps visitId / createdBy / updatedBy for visitNo / names when needed.
 */
export function normalizeMariTableColumns(
	columns: MariTableColumn[],
	options: { currentPage: number; pageSize: number }
): MariTableColumn[] {
	const normalized: MariTableColumn[] = [];
	let hasRowNo = false;

	for (const col of columns) {
		if (isMariTableDatabaseIdColumn(col)) {
			const replacement = replacementColumnForStripped(col);
			if (
				replacement &&
				!columnUsesField(columns, replacement.field!) &&
				!columnUsesField(normalized, replacement.field!)
			) {
				normalized.push(replacement);
			}
			continue;
		}
		if (isMariTableRowNumberColumn(col)) {
			hasRowNo = true;
			normalized.push(standardizeRowNumberColumn(col, options));
			continue;
		}
		normalized.push(col);
	}

	if (!hasRowNo) {
		return [mariTableRowNoColumn(options), ...normalized];
	}
	return normalized;
}
