import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	BranchPricingConfigDto,
	GrnLinePriceInput,
	GrnLinePriceResult
} from '$lib/model/type/heka/grn-pricing-config.type';
import {
	computeGrnLinePrices as computeGrnLinePricesCore,
	DEFAULT_BRANCH_PRICING_CONFIG
} from '$lib/tool/inventory/grn-pricing.util';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';

export {
	DEFAULT_BRANCH_PRICING_CONFIG,
	computeCostPerUnit,
	computeLandedCostTotals
} from '$lib/tool/inventory/grn-pricing.util';

export function computeGrnLinePrices(
	config: BranchPricingConfigDto,
	line: GrnLinePriceInput
): GrnLinePriceResult {
	const out = computeGrnLinePricesCore(config, line);
	if (!out.ok) throw error(400, out.error.message);
	return out.result;
}

export function rowToBranchPricingConfigDto(
	row: typeof table.invBranchPricingConfigTable.$inferSelect
): BranchPricingConfigDto {
	return {
		hospitalId: row.hospitalId,
		branchId: row.branchId,
		saleManualOnGrnLine: row.saleManualOnGrnLine,
		saleIncludeDiscount: row.saleIncludeDiscount,
		saleIncludeTax: row.saleIncludeTax,
		saleIncludeFreeQty: row.saleIncludeFreeQty,
		saleMarkupPercent: row.saleMarkupPercent,
		empManualOnGrnLine: row.empManualOnGrnLine,
		empIncludeDiscount: row.empIncludeDiscount,
		empIncludeTax: row.empIncludeTax,
		empIncludeFreeQty: row.empIncludeFreeQty,
		empMarkupPercent: row.empMarkupPercent,
		empUsePercentOfSale: row.empUsePercentOfSale,
		empPercentOfSale: row.empPercentOfSale
	};
}

/** Loads persisted config merged with defaults (no auth). */
export async function loadBranchPricingConfigEffectiveDb(input: {
	hospitalId: string;
	branchId: string;
}): Promise<BranchPricingConfigDto> {
	const [row] = await ensureDb()
		.select()
		.from(table.invBranchPricingConfigTable)
		.where(
			and(
				eq(
					table.invBranchPricingConfigTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.invBranchPricingConfigTable.branchId,
					input.branchId
				)
			)
		)
		.limit(1);
	if (!row) {
		return {
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			...DEFAULT_BRANCH_PRICING_CONFIG
		};
	}
	return rowToBranchPricingConfigDto(row);
}

export async function getBranchPricingConfig(
	event: RequestEvent,
	input: { hospitalId: string; branchId: string }
): Promise<BranchPricingConfigDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	if (!input.branchId?.trim()) throw error(400, 'branchId required');
	const [branch] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, input.branchId),
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!branch) throw error(400, 'Invalid branch');
	return loadBranchPricingConfigEffectiveDb(input);
}

function parseMarkupPercent(
	raw: string,
	label: string
): string {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0 || n > 999) {
		throw error(400, `Invalid ${label}`);
	}
	return n.toFixed(2);
}

export async function upsertBranchPricingConfig(
	event: RequestEvent,
	input: BranchPricingConfigDto
): Promise<BranchPricingConfigDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	if (!input.branchId?.trim()) throw error(400, 'branchId required');

	const saleMarkup = parseMarkupPercent(
		input.saleMarkupPercent,
		'sale markup percent'
	);
	const empMarkup = parseMarkupPercent(
		input.empMarkupPercent,
		'employee markup percent'
	);
	const empPct = Number(input.empPercentOfSale);
	if (!Number.isFinite(empPct) || empPct <= 0 || empPct > 999) {
		throw error(400, 'Invalid employee percent of sale');
	}

	const [branch] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, input.branchId),
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!branch) throw error(400, 'Invalid branch');

	const payload = {
		saleManualOnGrnLine: Boolean(input.saleManualOnGrnLine),
		saleIncludeDiscount: Boolean(input.saleIncludeDiscount),
		saleIncludeTax: Boolean(input.saleIncludeTax),
		saleIncludeFreeQty: Boolean(input.saleIncludeFreeQty),
		saleMarkupPercent: saleMarkup,
		empManualOnGrnLine: Boolean(input.empManualOnGrnLine),
		empIncludeDiscount: Boolean(input.empIncludeDiscount),
		empIncludeTax: Boolean(input.empIncludeTax),
		empIncludeFreeQty: Boolean(input.empIncludeFreeQty),
		empMarkupPercent: empMarkup,
		empUsePercentOfSale: Boolean(input.empUsePercentOfSale),
		empPercentOfSale: empPct.toFixed(2)
	};

	const [existing] = await ensureDb()
		.select({ id: table.invBranchPricingConfigTable.id })
		.from(table.invBranchPricingConfigTable)
		.where(
			and(
				eq(
					table.invBranchPricingConfigTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.invBranchPricingConfigTable.branchId,
					input.branchId
				)
			)
		)
		.limit(1);

	if (existing) {
		await ensureDb()
			.update(table.invBranchPricingConfigTable)
			.set(payload)
			.where(eq(table.invBranchPricingConfigTable.id, existing.id));
	} else {
		await ensureDb().insert(table.invBranchPricingConfigTable).values({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			...payload
		});
	}

	return loadBranchPricingConfigEffectiveDb({
		hospitalId: input.hospitalId,
		branchId: input.branchId
	});
}
