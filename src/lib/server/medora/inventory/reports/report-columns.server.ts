import type { ReportExportColumn } from './report-export.server';
import type { InventoryMovementRow } from '$lib/server/medora/inventory/stock-reports.server';

export type LowStockExportRow = {
	storeName: string | null;
	itemName: string | null;
	qty: string;
	minQty: string;
};

export type ExpiryExportRow = {
	storeName: string | null;
	itemName: string | null;
	batchNo: string | null;
	expiryDate: string | null;
	quantity: string;
};

export const MOVEMENT_REPORT_COLUMNS: ReportExportColumn<InventoryMovementRow>[] =
	[
		{ key: 'kind', header: 'Kind' },
		{ key: 'refNo', header: 'Ref no' },
		{ key: 'storeName', header: 'Store' },
		{ key: 'itemName', header: 'Item' },
		{ key: 'batchNo', header: 'Batch' },
		{ key: 'qty', header: 'Qty' },
		{ key: 'empSalePrice', header: 'EMP sale price' },
		{ key: 'lineAmount', header: 'Line amount' },
		{ key: 'createdAt', header: 'Created at' }
	];

export const LOW_STOCK_REPORT_COLUMNS: ReportExportColumn<LowStockExportRow>[] =
	[
		{ key: 'storeName', header: 'Store' },
		{ key: 'itemName', header: 'Item' },
		{ key: 'qty', header: 'On hand' },
		{ key: 'minQty', header: 'Min qty' }
	];

export const EXPIRY_REPORT_COLUMNS: ReportExportColumn<ExpiryExportRow>[] = [
	{ key: 'storeName', header: 'Store' },
	{ key: 'itemName', header: 'Item' },
	{ key: 'batchNo', header: 'Batch' },
	{ key: 'expiryDate', header: 'Expiry' },
	{ key: 'quantity', header: 'Qty' }
];
