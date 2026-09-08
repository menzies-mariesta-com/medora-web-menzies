import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { InvPricingModuleCode } from '$lib/model/type/medora/inv-pricing-module.type';
import type { PricingFormulaTemplateDto } from '$lib/model/type/medora/pricing-formula-template.type';
import type { SalePriceFormulaIssueResult } from '$lib/model/type/medora/sale-price-formula.type';
import { computeSalePriceFromFormula } from '$lib/tool/inventory/sale-price-calculator.util';
import { loadGrnCostContextForLine } from './grn-cost-context.server';
import { purchaseUnitPriceToIssueUnitPriceString } from './item-unit-inventory.server';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';
import {
	getPricingFormulaTemplate,
	rowToPricingFormulaTemplateDto
} from './pricing-formula-template.server';

async function toIssueUnitPrices(input: {
	hospitalId: string;
	itemId: number;
	purchaseUnitId: number;
	unitPricePurchase: string;
}): Promise<SalePriceFormulaIssueResult> {
	const unitPricePurchase = input.unitPricePurchase;
	const unitSalePriceIssue =
		Number(unitPricePurchase) > 0
			? await purchaseUnitPriceToIssueUnitPriceString({
					hospitalId: input.hospitalId,
					itemId: input.itemId,
					purchaseUnitId: input.purchaseUnitId,
					purchaseUnitPriceStr: unitPricePurchase
				})
			: '0.00';
	return {
		unitSalePriceIssue,
		unitEmpSalePriceIssue: unitSalePriceIssue,
		unitSalePricePurchase: unitPricePurchase,
		unitEmpSalePricePurchase: unitPricePurchase
	};
}

export async function resolveTemplateForSaleDb(input: {
	hospitalId: string;
	branchId: string;
	module: InvPricingModuleCode;
}): Promise<PricingFormulaTemplateDto> {
	const [assignment] = await ensureDb()
		.select()
		.from(table.invModulePricingAssignmentTable)
		.where(
			and(
				eq(
					table.invModulePricingAssignmentTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.invModulePricingAssignmentTable.branchId,
					input.branchId
				),
				eq(table.invModulePricingAssignmentTable.module, input.module)
			)
		)
		.limit(1);

	if (assignment) {
		const [template] = await ensureDb()
			.select()
			.from(table.invPricingFormulaTemplateTable)
			.where(
				eq(
					table.invPricingFormulaTemplateTable.id,
					assignment.formulaTemplateId
				)
			)
			.limit(1);
		if (template) return rowToPricingFormulaTemplateDto(template);
	}

	const [fallback] = await ensureDb()
		.select()
		.from(table.invPricingFormulaTemplateTable)
		.where(
			and(
				eq(
					table.invPricingFormulaTemplateTable.hospitalId,
					input.hospitalId
				),
				eq(table.invPricingFormulaTemplateTable.isSystemDefault, true)
			)
		)
		.limit(1);
	if (fallback) return rowToPricingFormulaTemplateDto(fallback);

	throw error(
		400,
		`No pricing formula assigned for module ${input.module} on this branch`
	);
}

export async function resolveTemplateForSale(
	event: RequestEvent,
	input: {
		hospitalId: string;
		branchId: string;
		module: InvPricingModuleCode;
	}
): Promise<PricingFormulaTemplateDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	return resolveTemplateForSaleDb(input);
}

export async function computeSalePriceAtTransactionDb(input: {
	hospitalId: string;
	batchId: number;
	itemId: number;
	storeId: number;
	module: InvPricingModuleCode;
}): Promise<SalePriceFormulaIssueResult> {
	const [store] = await ensureDb()
		.select({
			branchId: table.storeTable.branchId,
			storeMarkupPercent: table.storeTable.storeMarkupPercent
		})
		.from(table.storeTable)
		.where(eq(table.storeTable.id, input.storeId))
		.limit(1);
	if (!store) throw error(400, 'Store not found');

	const [batch] = await ensureDb()
		.select()
		.from(table.itemBatchTable)
		.where(
			and(
				eq(table.itemBatchTable.id, input.batchId),
				eq(table.itemBatchTable.hospitalId, input.hospitalId),
				eq(table.itemBatchTable.itemId, input.itemId)
			)
		)
		.limit(1);
	if (!batch) throw error(400, 'Batch not found');
	if (!batch.goodsReceiptLineId) {
		throw error(
			400,
			'Batch has no goods receipt provenance for price calculation'
		);
	}

	const [grnLine] = await ensureDb()
		.select()
		.from(table.goodsReceiptLineTable)
		.where(eq(table.goodsReceiptLineTable.id, batch.goodsReceiptLineId))
		.limit(1);
	if (!grnLine) throw error(400, 'Goods receipt line not found');

	const [item] = await ensureDb()
		.select({
			itemMarkupPercent: table.itemMasterTable.itemMarkupPercent
		})
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.id, input.itemId),
				eq(table.itemMasterTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!item) throw error(400, 'Item not found');

	const template = await resolveTemplateForSaleDb({
		hospitalId: input.hospitalId,
		branchId: store.branchId,
		module: input.module
	});

	const grnCostContext = await loadGrnCostContextForLine({
		goodsReceiptLineId: batch.goodsReceiptLineId
	});

	const purchPrices = computeSalePriceFromFormula({
		module: input.module,
		branchId: store.branchId,
		storeId: input.storeId,
		itemId: input.itemId,
		batchId: input.batchId,
		grnLine: grnCostContext.lines[grnCostContext.targetLineIndex],
		grnCostContext,
		itemMarkupPercent: item.itemMarkupPercent,
		storeMarkupPercent: store.storeMarkupPercent,
		template
	});

	return toIssueUnitPrices({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		purchaseUnitId: grnLine.unitId,
		unitPricePurchase: purchPrices.unitPricePurchase
	});
}

export async function computeSalePriceAtTransaction(
	event: RequestEvent,
	input: {
		hospitalId: string;
		batchId: number;
		itemId: number;
		storeId: number;
		module: InvPricingModuleCode;
	}
): Promise<SalePriceFormulaIssueResult> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	return computeSalePriceAtTransactionDb(input);
}

/** Preview helper for admin UI (optional template override). */
export async function previewSalePrice(
	event: RequestEvent,
	input: {
		hospitalId: string;
		batchId: number;
		itemId: number;
		storeId: number;
		module: InvPricingModuleCode;
		templateId?: number;
	}
): Promise<SalePriceFormulaIssueResult & { templateId: number }> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const [store] = await ensureDb()
		.select({
			branchId: table.storeTable.branchId,
			storeMarkupPercent: table.storeTable.storeMarkupPercent
		})
		.from(table.storeTable)
		.where(eq(table.storeTable.id, input.storeId))
		.limit(1);
	if (!store) throw error(400, 'Store not found');

	let template: PricingFormulaTemplateDto | null = null;
	if (input.templateId != null) {
		template = await getPricingFormulaTemplate(event, {
			hospitalId: input.hospitalId,
			id: input.templateId
		});
		if (!template) throw error(400, 'Template not found');
	} else {
		template = await resolveTemplateForSale(event, {
			hospitalId: input.hospitalId,
			branchId: store.branchId,
			module: input.module
		});
	}

	const [batch] = await ensureDb()
		.select()
		.from(table.itemBatchTable)
		.where(
			and(
				eq(table.itemBatchTable.id, input.batchId),
				eq(table.itemBatchTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!batch?.goodsReceiptLineId) {
		throw error(400, 'Batch or GRN line not found');
	}

	const [grnLine] = await ensureDb()
		.select()
		.from(table.goodsReceiptLineTable)
		.where(eq(table.goodsReceiptLineTable.id, batch.goodsReceiptLineId))
		.limit(1);
	if (!grnLine) throw error(400, 'Goods receipt line not found');

	const [item] = await ensureDb()
		.select({
			itemMarkupPercent: table.itemMasterTable.itemMarkupPercent
		})
		.from(table.itemMasterTable)
		.where(eq(table.itemMasterTable.id, input.itemId))
		.limit(1);
	if (!item) throw error(400, 'Item not found');

	const grnCostContext = await loadGrnCostContextForLine({
		goodsReceiptLineId: batch.goodsReceiptLineId
	});

	const purchPrices = computeSalePriceFromFormula({
		module: input.module,
		branchId: store.branchId,
		storeId: input.storeId,
		itemId: input.itemId,
		batchId: input.batchId,
		grnLine: grnCostContext.lines[grnCostContext.targetLineIndex],
		grnCostContext,
		itemMarkupPercent: item.itemMarkupPercent,
		storeMarkupPercent: store.storeMarkupPercent,
		template
	});

	const issuePrices = await toIssueUnitPrices({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		purchaseUnitId: grnLine.unitId,
		unitPricePurchase: purchPrices.unitPricePurchase
	});

	return {
		templateId: template.id,
		...issuePrices
	};
}
