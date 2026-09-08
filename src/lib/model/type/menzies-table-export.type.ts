import type { ClientReportExportColumn } from '$lib/tool/inventory/report-export-client.util';

export type MenziesTableExportFormat = 'csv' | 'xlsx' | 'pdf' | 'print';

/** Client-side export configuration for {@link MenziesTable}. */
export type MenziesTableExportConfig = {
	columns: ClientReportExportColumn<Record<string, unknown>>[];
	title: string;
	subtitle?: string;
	filenameStem?: string;
	/** Defaults to all formats when export is enabled. */
	formats?: MenziesTableExportFormat[];
	/**
	 * Optional fetch for export rows (e.g. server query with current filters).
	 * When omitted, current `rows` are exported.
	 */
	fetchExportRows?: () => Promise<Record<string, unknown>[]>;
};
