import type { ClientReportExportColumn } from '$lib/tool/inventory/report-export-client.util';

export type MariTableExportFormat = 'csv' | 'xlsx' | 'pdf' | 'print';

/** Client-side export configuration for {@link MariTable}. */
export type MariTableExportConfig = {
	columns: ClientReportExportColumn<Record<string, unknown>>[];
	title: string;
	subtitle?: string;
	filenameStem?: string;
	/** Defaults to all formats when export is enabled. */
	formats?: MariTableExportFormat[];
	/**
	 * Optional fetch for export rows (e.g. server query with current filters).
	 * When omitted, current `rows` are exported.
	 */
	fetchExportRows?: () => Promise<Record<string, unknown>[]>;
};
