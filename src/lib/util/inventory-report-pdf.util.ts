import { htmlStringToPdfBlob } from '$lib/util/html-to-pdf.util';

export type InventoryReportPdfColumn = {
	header: string;
	/** Return display cell text. */
	cell: (row: Record<string, unknown>) => string;
};

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Simple tabular PDF for inventory reports (client-side rasterization).
 */
export function buildInventoryReportTableHtml(params: {
	title: string;
	subtitle?: string;
	columns: InventoryReportPdfColumn[];
	rows: Record<string, unknown>[];
}): string {
	const { title, subtitle, columns, rows } = params;
	const head = columns
		.map((c) => `<th>${escapeHtml(c.header)}</th>`)
		.join('');
	const body = rows
		.map(
			(row) =>
				`<tr>${columns.map((c) => `<td>${escapeHtml(c.cell(row))}</td>`).join('')}</tr>`
		)
		.join('');
	const sub = subtitle
		? `<p class="sub">${escapeHtml(subtitle)}</p>`
		: '';
	return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
body{font-family:system-ui,sans-serif;font-size:11px;padding:16px;color:#111}
h1{font-size:16px;margin:0 0 8px}
.sub{font-size:10px;color:#444;margin:0 0 12px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f3f4f6;font-weight:600}
tr:nth-child(even){background:#fafafa}
</style></head><body>
<h1>${escapeHtml(title)}</h1>${sub}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

export async function downloadInventoryReportPdf(params: {
	filename: string;
	title: string;
	subtitle?: string;
	columns: InventoryReportPdfColumn[];
	rows: Record<string, unknown>[];
}): Promise<void> {
	const html = buildInventoryReportTableHtml({
		title: params.title,
		subtitle: params.subtitle,
		columns: params.columns,
		rows: params.rows
	});
	const blob = await htmlStringToPdfBlob(html);
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = params.filename.endsWith('.pdf')
		? params.filename
		: `${params.filename}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
}
