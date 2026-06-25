import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
import type { ConsumptionDraftLineIum } from '$lib/model/type/heka/department-consumption-detail.type';
import type { InventoryStockLotDto } from '$lib/model/type/heka/inventory-stock-lot.type';
import { mapStockLotToBatchAllocationDraft } from '$lib/tool/inventory/map-stock-lot-to-batch-draft.util';
import {
	issueQtyToPurchaseQtyNumber,
	purchaseQtyToIssueQtyNumber
} from '$lib/tool/inventory/purchase-issue-qty-convert.util';

export async function hydrateMedOrderItemMeta(
	hospitalId: string,
	itemId: number
): Promise<{
	itemName: string;
	itemUnitMasterIds: number[];
	defaultItemUnitMasterId: number | null;
}> {
	const res = await fetch(
		`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemId}`,
		{ credentials: 'include' }
	);
	if (!res.ok) throw new Error(String(res.status));
	const detail = (await res.json()) as {
		itemName?: string | null;
		itemUnitMasterIds?: number[];
		defaultItemUnitMasterId?: number | null;
	};
	return {
		itemName: detail.itemName?.trim() || `Item #${itemId}`,
		itemUnitMasterIds: detail.itemUnitMasterIds ?? [],
		defaultItemUnitMasterId: detail.defaultItemUnitMasterId ?? null
	};
}

export async function loadMedOrderIumList(
	hospitalId: string,
	itemUnitMasterIds: number[],
	defaultItemUnitMasterId: number | null
): Promise<{
	iumList: ConsumptionDraftLineIum[];
	itemUnitMasterId: number | null;
}> {
	const res = await fetch(
		`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
		{ credentials: 'include' }
	);
	if (!res.ok) throw new Error(String(res.status));
	const allIum = (await res.json()) as ConsumptionDraftLineIum[];
	const allowed = new Set(itemUnitMasterIds);
	const allowedRows = allIum.filter((u) => allowed.has(u.id));
	let chosen: ConsumptionDraftLineIum | undefined =
		defaultItemUnitMasterId != null
			? allowedRows.find((u) => u.id === defaultItemUnitMasterId)
			: undefined;
	if (!chosen && allowedRows.length > 0) chosen = allowedRows[0];
	return {
		iumList: chosen ? [chosen] : [],
		itemUnitMasterId: chosen?.id ?? null
	};
}

export async function refreshMedOrderBatchAllocations(
	hospitalId: string,
	storeId: number,
	itemId: number
): Promise<ConsumptionBatchAllocationDraft[]> {
	const ps = new URLSearchParams();
	ps.set('mode', 'lots');
	ps.set('storeId', String(storeId));
	ps.set('itemId', String(itemId));
	const res = await fetch(
		`/api/heka/hospital/${hospitalId}/home/inventory/stock?${ps}`,
		{ credentials: 'include' }
	);
	if (!res.ok) throw new Error(String(res.status));
	const rows = (await res.json()) as InventoryStockLotDto[];
	return rows
		.filter((r) => Number(r.quantity) > 1e-9)
		.map((r) => mapStockLotToBatchAllocationDraft(r));
}

type IumFactors = {
	purchaseConversionFactor: string;
	issueConversionFactor: string;
};

function formatPurchaseQty(n: number): string {
	if (!Number.isFinite(n) || n <= 0) return '';
	const rounded = Math.round(n * 1e6) / 1e6;
	return String(rounded);
}

/**
 * Distribute purchase qty across batches in order (FEFO: earliest expiry first).
 * Rows should already be sorted by expiry from stock lots API.
 */
export function allocateFefoPurchaseQty(
	allocations: ConsumptionBatchAllocationDraft[],
	totalPurchaseQtyStr: string,
	factors: IumFactors
): ConsumptionBatchAllocationDraft[] {
	const total = Number(String(totalPurchaseQtyStr).trim());
	if (!Number.isFinite(total) || total <= 0) {
		return allocations.map((a) => ({ ...a, qtyPurchase: '' }));
	}

	let remaining = total;
	return allocations.map((a) => {
		if (remaining <= 1e-9) {
			return { ...a, qtyPurchase: '' };
		}
		const stockIssue = Number(a.stockIssueQty);
		if (!Number.isFinite(stockIssue) || stockIssue <= 0) {
			return { ...a, qtyPurchase: '' };
		}
		const maxPurchase = issueQtyToPurchaseQtyNumber(
			String(stockIssue),
			factors.purchaseConversionFactor,
			factors.issueConversionFactor
		);
		if (maxPurchase == null || maxPurchase <= 0) {
			return { ...a, qtyPurchase: '' };
		}
		const take = Math.min(remaining, maxPurchase);
		remaining -= take;
		return { ...a, qtyPurchase: formatPurchaseQty(take) };
	});
}

/** Apply FEFO when line purchase qty is set (sale qty field). */
export function syncMedOrderFefoAllocations(input: {
	batchAllocations: ConsumptionBatchAllocationDraft[];
	issueQtyPurchase: string;
	ium: ConsumptionDraftLineIum | null;
}): ConsumptionBatchAllocationDraft[] {
	const { batchAllocations, issueQtyPurchase, ium } = input;
	if (!ium || batchAllocations.length === 0) return batchAllocations;
	return allocateFefoPurchaseQty(batchAllocations, issueQtyPurchase, {
		purchaseConversionFactor: ium.purchaseConversionFactor,
		issueConversionFactor: ium.issueConversionFactor
	});
}

export type MedOrderDraftLineStockReservation = {
	itemMasterId: number;
	_batchAllocations: ConsumptionBatchAllocationDraft[];
};

/**
 * Reduce displayed lot stock for draft lines already on the list (same item, pre-save).
 * DB stock is deducted only on batch save; this keeps pick/validate aligned in-session.
 */
export function applyDraftReservationsToLots(
	lots: ConsumptionBatchAllocationDraft[],
	draftLines: MedOrderDraftLineStockReservation[],
	itemId: number,
	ium: ConsumptionDraftLineIum | null
): ConsumptionBatchAllocationDraft[] {
	if (!ium || lots.length === 0) return lots;
	const pf = ium.purchaseConversionFactor;
	const iff = ium.issueConversionFactor;
	const reservedIssueByBatch = new Map<number, number>();

	for (const line of draftLines) {
		if (line.itemMasterId !== itemId) continue;
		for (const a of line._batchAllocations) {
			const qp = a.qtyPurchase.trim();
			if (!qp || Number(qp) <= 0) continue;
			const need = purchaseQtyToIssueQtyNumber(qp, pf, iff);
			if (need == null || need <= 0) continue;
			reservedIssueByBatch.set(
				a.batchId,
				(reservedIssueByBatch.get(a.batchId) ?? 0) + need
			);
		}
	}

	return lots.map((lot) => {
		const reserved = reservedIssueByBatch.get(lot.batchId) ?? 0;
		const avail = Math.max(0, Number(lot.stockIssueQty) - reserved);
		return { ...lot, stockIssueQty: String(avail) };
	});
}

/** Set line sale qty from the sum of per-batch purchase qty inputs. */
export function syncIssueQtyFromAllocations(
	allocations: ConsumptionBatchAllocationDraft[]
): string {
	return sumAllocationPurchaseQty(allocations);
}

export function sumAllocationPurchaseQty(
	allocations: ConsumptionBatchAllocationDraft[]
): string {
	let sum = 0;
	for (const a of allocations) {
		const q = Number(a.qtyPurchase);
		if (Number.isFinite(q) && q > 0) sum += q;
	}
	return sum > 0 ? String(sum) : '';
}

export function validateMedOrderInventoryLine(input: {
	batchAllocations: ConsumptionBatchAllocationDraft[];
	ium: ConsumptionDraftLineIum | null;
	issueQtyPurchase: string;
	unitSalePrice: string;
}): string | null {
	const { batchAllocations, ium, issueQtyPurchase, unitSalePrice } =
		input;
	if (!ium) return 'Item unit is required';
	const withQty = batchAllocations.filter(
		(a) => Number(a.qtyPurchase) > 0
	);
	if (withQty.length === 0) {
		return 'Enter quantity for at least one batch';
	}
	const sum = sumAllocationPurchaseQty(batchAllocations);
	if (!sum || sum !== issueQtyPurchase.trim()) {
		return 'Line quantity must match batch allocations';
	}
	const factors = {
		purchaseConversionFactor: ium.purchaseConversionFactor,
		issueConversionFactor: ium.issueConversionFactor
	};
	for (const a of withQty) {
		const need = Number(
			purchaseQtyToIssueQtyNumber(
				a.qtyPurchase,
				factors.purchaseConversionFactor,
				factors.issueConversionFactor
			)
		);
		if (need > Number(a.stockIssueQty) + 1e-6) {
			return 'Quantity exceeds stock for a batch';
		}
	}
	const p = Number(unitSalePrice);
	if (!Number.isFinite(p) || p < 0) return 'Invalid sale price';
	return null;
}

export function lineTotal(
	issueQtyPurchase: string,
	unitSalePrice: string
): number {
	const q = Number(issueQtyPurchase);
	const p = Number(unitSalePrice);
	if (!Number.isFinite(q) || !Number.isFinite(p)) return 0;
	return Math.round(q * p * 100) / 100;
}
