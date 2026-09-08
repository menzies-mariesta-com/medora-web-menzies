import { error } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import type { InventoryReportFormat } from '$lib/model/type/medora/inventory-report.type';

export const MAX_REPORT_EXPORT_ROWS = 10_000;

export type ReportExportColumn<T extends Record<string, unknown>> = {
	key: keyof T & string;
	header: string;
	/** Cell value for export; defaults to stringified row[key]. */
	format?: (row: T) => string;
};

export function parseReportFormat(
	raw: string | null | undefined
): InventoryReportFormat {
	const f = (raw ?? 'json').toLowerCase();
	if (f === 'csv' || f === 'xlsx') return f;
	return 'json';
}

function cellValue<T extends Record<string, unknown>>(
	row: T,
	col: ReportExportColumn<T>
): string {
	if (col.format) return col.format(row);
	const v = row[col.key];
	if (v == null) return '';
	return String(v);
}

function escapeCsvField(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function rowsToCsv<T extends Record<string, unknown>>(
	columns: ReportExportColumn<T>[],
	rows: T[]
): string {
	const header = columns.map((c) => escapeCsvField(c.header)).join(',');
	const lines = rows.map((row) =>
		columns.map((c) => escapeCsvField(cellValue(row, c))).join(',')
	);
	return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

export function rowsToXlsxBuffer<T extends Record<string, unknown>>(
	sheetName: string,
	columns: ReportExportColumn<T>[],
	rows: T[]
): Buffer {
	const aoa: string[][] = [
		columns.map((c) => c.header),
		...rows.map((row) => columns.map((c) => cellValue(row, c)))
	];
	const ws = XLSX.utils.aoa_to_sheet(aoa);
	const wb = XLSX.utils.book_new();
	const safeName = sheetName.slice(0, 31) || 'Report';
	XLSX.utils.book_append_sheet(wb, ws, safeName);
	const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
	return Buffer.from(out);
}

export function reportFileResponse(
	body: string | Buffer,
	contentType: string,
	filename: string
): Response {
	const safe = filename.replace(/[^\w.-]+/g, '_');
	return new Response(body, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `attachment; filename="${safe}"`
		}
	});
}

export function buildReportExportResponse<T extends Record<string, unknown>>(
	rows: T[],
	columns: ReportExportColumn<T>[],
	format: InventoryReportFormat,
	baseFilename: string
): Response {
	if (format !== 'json' && rows.length > MAX_REPORT_EXPORT_ROWS) {
		throw error(
			400,
			`Export is limited to ${MAX_REPORT_EXPORT_ROWS} rows. Narrow your filters.`
		);
	}
	const stamp = new Date().toISOString().slice(0, 10);
	if (format === 'csv') {
		return reportFileResponse(
			rowsToCsv(columns, rows),
			'text/csv; charset=utf-8',
			`${baseFilename}-${stamp}.csv`
		);
	}
	if (format === 'xlsx') {
		return reportFileResponse(
			rowsToXlsxBuffer(baseFilename, columns, rows),
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			`${baseFilename}-${stamp}.xlsx`
		);
	}
	throw error(400, 'Use format=json for JSON responses');
}
