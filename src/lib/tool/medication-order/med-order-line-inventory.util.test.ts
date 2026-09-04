import { describe, expect, it } from 'vitest';
import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
import {
	allocateFefoPurchaseQty,
	applyDraftReservationsToLots
} from './med-order-line-inventory.util';

const factors = {
	purchaseConversionFactor: '1',
	issueConversionFactor: '1'
};

function lot(
	batchId: number,
	stockIssueQty: string,
	expiryDate: string | null = null
): ConsumptionBatchAllocationDraft {
	return {
		batchId,
		batchNo: `B${batchId}`,
		expiryDate,
		stockIssueQty,
		salePrice: '10',
		issueUnitName: 'tab',
		qtyPurchase: ''
	};
}

describe('applyDraftReservationsToLots', () => {
	const ium = {
		id: 1,
		purchaseUnitId: 10,
		issueUnitId: 20,
		purchaseUnitName: 'box',
		issueUnitName: 'tab',
		purchaseConversionFactor: '1',
		issueConversionFactor: '1',
		conversionDisplay: '1 box = 1 tab'
	};

	it('reduces displayed stock for same item on draft list', () => {
		const lots: ConsumptionBatchAllocationDraft[] = [
			{
				batchId: 10,
				batchNo: 'B10',
				expiryDate: null,
				stockIssueQty: '10',
				salePrice: null,
				issueUnitName: null,
				qtyPurchase: ''
			}
		];
		const out = applyDraftReservationsToLots(
			lots,
			[
				{
					itemMasterId: 5,
					_batchAllocations: [
						{
							...lots[0]!,
							qtyPurchase: '3'
						}
					]
				}
			],
			5,
			ium
		);
		expect(out[0]?.stockIssueQty).toBe('7');
	});
});

describe('allocateFefoPurchaseQty', () => {
	it('allocates from earliest-expiry batch first (FEFO)', () => {
		const rows = [lot(1, '3', '2026-06-01'), lot(2, '5', '2027-01-01')];
		const out = allocateFefoPurchaseQty(rows, '2', factors);
		expect(out[0]?.qtyPurchase).toBe('2');
		expect(out[1]?.qtyPurchase).toBe('');
	});

	it('spans batches when total exceeds first lot', () => {
		const rows = [lot(1, '3', '2026-06-01'), lot(2, '5', '2027-01-01')];
		const out = allocateFefoPurchaseQty(rows, '7', factors);
		expect(out[0]?.qtyPurchase).toBe('3');
		expect(out[1]?.qtyPurchase).toBe('4');
	});

	it('clears batch qty when total is empty', () => {
		const rows = [
			{ ...lot(1, '3'), qtyPurchase: '1' },
			{ ...lot(2, '5'), qtyPurchase: '2' }
		];
		const out = allocateFefoPurchaseQty(rows, '', factors);
		expect(out.every((a) => a.qtyPurchase === '')).toBe(true);
	});
});
