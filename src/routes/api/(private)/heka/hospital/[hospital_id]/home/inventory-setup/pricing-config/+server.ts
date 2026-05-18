import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { BranchPricingConfigDto } from '$lib/model/type/heka/grn-pricing-config.type';
import {
	getBranchPricingConfig,
	upsertBranchPricingConfig
} from '$lib/server/heka/inventory/grn-pricing.server';

function dtoFromBody(
	hospitalId: string,
	body: Record<string, unknown>
): BranchPricingConfigDto {
	const branchId = String(body.branchId ?? '').trim();
	if (!branchId) throw error(400, 'branchId required');
	return {
		hospitalId,
		branchId,
		saleManualOnGrnLine: Boolean(body.saleManualOnGrnLine),
		saleIncludeDiscount: Boolean(body.saleIncludeDiscount ?? true),
		saleIncludeTax: Boolean(body.saleIncludeTax ?? true),
		saleIncludeFreeQty: Boolean(body.saleIncludeFreeQty),
		saleMarkupPercent: String(body.saleMarkupPercent ?? '0'),
		empManualOnGrnLine: Boolean(body.empManualOnGrnLine),
		empIncludeDiscount: Boolean(body.empIncludeDiscount ?? true),
		empIncludeTax: Boolean(body.empIncludeTax ?? true),
		empIncludeFreeQty: Boolean(body.empIncludeFreeQty ?? true),
		empMarkupPercent: String(body.empMarkupPercent ?? '0'),
		empUsePercentOfSale: Boolean(body.empUsePercentOfSale),
		empPercentOfSale: String(body.empPercentOfSale ?? '100')
	};
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const branchId = event.url.searchParams.get('branchId');
	if (!branchId?.trim()) {
		throw error(400, 'branchId required');
	}
	const config = await getBranchPricingConfig(event, {
		hospitalId,
		branchId: branchId.trim()
	});
	return json({ config });
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON');

	const config = await upsertBranchPricingConfig(
		event,
		dtoFromBody(hospitalId, body)
	);
	return json({ config });
};
