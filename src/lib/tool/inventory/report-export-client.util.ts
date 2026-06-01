import { buildInventoryReportTableHtml } from '$lib/util/inventory-report-pdf.util';
import { downloadInventoryReportPdf } from '$lib/util/inventory-report-pdf.util';
import type { InventoryReportPdfColumn } from '$lib/util/inventory-report-pdf.util';

export type ClientReportExportColumn<T extends Record<string, unknown>> = {
	key: keyof T & string;
	header: string;
	format?: (row: T) => string;
};

function cellValue<T extends Record<string, unknown>>(
	row: T,
	col: ClientReportExportColumn<T>
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

export function rowsToCsvString<T extends Record<string, unknown>>(
	columns: ClientReportExportColumn<T>[],
	rows: T[]
): string {
	const header = columns.map((c) => escapeCsvField(c.header)).join(',');
	const lines = rows.map((row) =>
		columns.map((c) => escapeCsvField(cellValue(row, c))).join(',')
	);
	return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

export function downloadRowsAsCsv<T extends Record<string, unknown>>(
	columns: ClientReportExportColumn<T>[],
	rows: T[],
	filename: string
): void {
	const csv = rowsToCsvString(columns, rows);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export async function downloadRowsAsXlsx<T extends Record<string, unknown>>(
	columns: ClientReportExportColumn<T>[],
	rows: T[],
	filename: string,
	sheetName = 'Report'
): Promise<void> {
	const XLSX = await import('xlsx');
	const aoa: string[][] = [
		columns.map((c) => c.header),
		...rows.map((row) => columns.map((c) => cellValue(row, c)))
	];
	const ws = XLSX.utils.aoa_to_sheet(aoa);
	const wb = XLSX.utils.book_new();
	const safeName = sheetName.slice(0, 31) || 'Report';
	XLSX.utils.book_append_sheet(wb, ws, safeName);
	const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
	const blob = new Blob([out], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});
	triggerDownload(
		blob,
		filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
	);
}

export async function downloadRowsAsPdf(params: {
	columns: InventoryReportPdfColumn[];
	rows: Record<string, unknown>[];
	filename: string;
	title: string;
	subtitle?: string;
}): Promise<void> {
	await downloadInventoryReportPdf({
		filename: params.filename,
		title: params.title,
		subtitle: params.subtitle,
		columns: params.columns,
		rows: params.rows
	});
}

export function printRowsAsTable(params: {
	title: string;
	subtitle?: string;
	columns: InventoryReportPdfColumn[];
	rows: Record<string, unknown>[];
}): void {
	const html = buildInventoryReportTableHtml(params);

	const iframe = document.createElement('iframe');
	iframe.setAttribute('aria-hidden', 'true');
	iframe.style.cssText =
		'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
	document.body.appendChild(iframe);

	const frameWindow = iframe.contentWindow;
	if (!frameWindow) {
		iframe.remove();
		throw new Error('Print is not available in this browser');
	}

	const doc = frameWindow.document;
	doc.open();
	doc.write(html);
	doc.close();

	const cleanup = () => {
		iframe.remove();
	};
	frameWindow.addEventListener('afterprint', cleanup, { once: true });
	// Fallback if afterprint never fires (some browsers / cancel dialog)
	setTimeout(cleanup, 60_000);

	frameWindow.focus();
	// Let the iframe layout complete before opening the print dialog
	setTimeout(() => {
		frameWindow.print();
	}, 250);
}

function triggerDownload(blob: Blob, filename: string): void {
	const safe = filename.replace(/[^\w.-]+/g, '_');
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = safe;
	a.click();
	URL.revokeObjectURL(url);
}

export function clientExportColumnsToPdfColumns<
	T extends Record<string, unknown>
>(columns: ClientReportExportColumn<T>[]): InventoryReportPdfColumn[] {
	return columns.map((c) => ({
		header: c.header,
		cell: (row) => cellValue(row as T, c)
	}));
}
