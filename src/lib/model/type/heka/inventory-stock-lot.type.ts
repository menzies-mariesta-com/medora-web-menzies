/** Stock lot row from `GET .../inventory/stock?mode=lots`. */
export type InventoryStockLotDto = {
	id: number;
	batchId: number;
	storeId: number;
	itemId: number;
	quantity: string;
	batchNo: string | null;
	expiryDate: string | null;
	purchasePrice: string | null;
	itemName?: string | null;
	storeName?: string | null;
	issueUnitName?: string | null;
	goodsReceiptLineId?: number | null;
	grnReceivedDate?: string | null;
	grnInvoiceNo?: string | null;
};
