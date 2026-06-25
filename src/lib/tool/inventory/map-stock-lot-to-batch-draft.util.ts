import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
import type { InventoryStockLotDto } from '$lib/model/type/heka/inventory-stock-lot.type';

/** Maps stock lots API rows to batch pick table drafts. */
export function mapStockLotToBatchAllocationDraft(
	row: InventoryStockLotDto
): ConsumptionBatchAllocationDraft {
	return {
		batchId: row.batchId,
		batchNo: String(row.batchNo ?? ''),
		expiryDate: row.expiryDate ?? null,
		stockIssueQty: String(row.quantity ?? '0'),
		salePrice: null,
		empSalePrice: null,
		issueUnitName: row.issueUnitName ?? null,
		grnReceivedDate: row.grnReceivedDate ?? null,
		grnInvoiceNo: row.grnInvoiceNo ?? null,
		qtyPurchase: ''
	};
}
