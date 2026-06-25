import { describe, expect, it } from 'vitest';
import { mapStockLotToBatchAllocationDraft } from '$lib/tool/inventory/map-stock-lot-to-batch-draft.util';

describe('mapStockLotToBatchAllocationDraft', () => {
	it('maps GRN receipt metadata for cost-lot disambiguation', () => {
		const draft = mapStockLotToBatchAllocationDraft({
			id: 1,
			batchId: 10,
			storeId: 2,
			itemId: 3,
			quantity: '5',
			batchNo: 'BATCH-A',
			expiryDate: '2027-01-01',
			purchasePrice: '12.50',
			issueUnitName: 'tab',
			grnReceivedDate: '2026-06-01',
			grnInvoiceNo: 'INV-99'
		});
		expect(draft.batchId).toBe(10);
		expect(draft.grnReceivedDate).toBe('2026-06-01');
		expect(draft.grnInvoiceNo).toBe('INV-99');
	});
});
