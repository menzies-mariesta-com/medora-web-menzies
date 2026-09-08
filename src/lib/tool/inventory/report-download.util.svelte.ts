import type { InventoryReportFormat } from '$lib/model/type/medora/inventory-report.type';

export function downloadBlob(filename: string, blob: Blob): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function filenameFromContentDisposition(
	header: string | null
): string | null {
	if (!header) return null;
	const m = /filename="?([^";\n]+)"?/i.exec(header);
	return m?.[1]?.trim() ?? null;
}

/** Fetches CSV/XLSX from a report API and triggers browser download. */
export async function fetchReportExport(
	apiUrl: string,
	format: Exclude<InventoryReportFormat, 'json'>
): Promise<void> {
	const url = new URL(apiUrl, window.location.origin);
	url.searchParams.set('format', format);
	const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
	if (!res.ok) {
		let detail = res.statusText;
		try {
			const j = (await res.json()) as { message?: string };
			if (j.message) detail = j.message;
		} catch {
			/* not json */
		}
		throw new Error(detail || `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const name =
		filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
		`report.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
	downloadBlob(name, blob);
}

export function buildReportApiUrl(
	basePath: string,
	params: Record<string, string | number | undefined | null>
): string {
	const ps = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v == null || v === '') continue;
		ps.set(k, String(v));
	}
	const q = ps.toString();
	return q ? `${basePath}?${q}` : basePath;
}
