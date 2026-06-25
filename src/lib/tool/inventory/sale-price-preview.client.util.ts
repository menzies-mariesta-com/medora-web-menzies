import type { InvPricingModuleCode } from '$lib/model/type/heka/inv-pricing-module.type';

export type SalePricePreviewResult = {
	templateId: number;
	unitSalePriceIssue: string;
	unitEmpSalePriceIssue: string;
	unitSalePricePurchase: string;
	unitEmpSalePricePurchase: string;
};

/** Fetches computed sale price for a batch at transaction time (non-binding preview). */
export async function fetchSalePricePreview(input: {
	hospitalId: string;
	storeId: number;
	itemId: number;
	batchId: number;
	module: InvPricingModuleCode;
}): Promise<SalePricePreviewResult | null> {
	const res = await fetch(
		`/api/heka/hospital/${input.hospitalId}/home/inventory-setup/pricing-config?action=preview`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				storeId: input.storeId,
				itemId: input.itemId,
				batchId: input.batchId,
				module: input.module
			})
		}
	);
	if (!res.ok) return null;
	return (await res.json()) as SalePricePreviewResult;
}

export function primaryBatchIdFromAllocations(
	allocations: { batchId: number; qtyPurchase: string }[]
): number | null {
	for (const a of allocations) {
		if (Number(a.qtyPurchase) > 0) return a.batchId;
	}
	return allocations[0]?.batchId ?? null;
}
