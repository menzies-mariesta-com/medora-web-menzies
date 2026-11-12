import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { InvPricingModuleCode } from '$lib/model/type/medora/inv-pricing-module.type';
import type {
	PatientChargePricingInputsSnapshot
} from '$lib/model/type/medora/patient-charge-pricing.type';
import type { PatientChargePricingSnapshotFields } from '$lib/model/type/medora/patient-charge-pricing.type';
import type { PricingFormulaTemplateDto } from '$lib/model/type/medora/pricing-formula-template.type';
import type { SalePriceFormulaIssueResult } from '$lib/model/type/medora/sale-price-formula.type';
import { computeSalePriceFromFormula } from '$lib/tool/inventory/sale-price-calculator.util';
import { toDbMoney2dp } from '$lib/server/medora/money-normalize.server';
import { loadGrnCostContextForLine } from './grn-cost-context.server';
import { purchaseUnitPriceToIssueUnitPriceString } from './item-unit-inventory.server';
import { getPricingFormulaTemplateByIdDb } from './pricing-formula-template.server';

export function parsePatientChargePricingInputsSnapshot(
	raw: unknown
): PatientChargePricingInputsSnapshot | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	if (
		typeof o.formulaVersion !== 'number' ||
		typeof o.itemMarkupPercent !== 'string' ||
		typeof o.storeMarkupPercent !== 'string' ||
		typeof o.mslMarkupPercent !== 'string'
	) {
		return null;
	}
	return {
		formulaVersion: o.formulaVersion,
		itemMarkupPercent: o.itemMarkupPercent,
		storeMarkupPercent: o.storeMarkupPercent,
		mslMarkupPercent: o.mslMarkupPercent
	};
}

export function buildPricingInputsSnapshot(input: {
	template: PricingFormulaTemplateDto;
	itemMarkupPercent: string;
	storeMarkupPercent: string;
}): PatientChargePricingInputsSnapshot {
	return {
		formulaVersion: input.template.formulaVersion,
		itemMarkupPercent: toDbMoney2dp(input.itemMarkupPercent),
		storeMarkupPercent: toDbMoney2dp(input.storeMarkupPercent),
		mslMarkupPercent: toDbMoney2dp(input.template.mslMarkupPercent)
	};
}

/** Copy frozen charge metadata onto OP/IP billing line rows. */
export function patientChargeFieldsForBillingLine(
	row: PatientChargePricingSnapshotFields
): PatientChargePricingSnapshotFields {
	return {
		pricingFormulaTemplateId: row.pricingFormulaTemplateId,
		pricingModule: row.pricingModule,
		pricingBatchId: row.pricingBatchId,
		unitSalePriceIssue: row.unitSalePriceIssue,
		pricingInputsSnapshot: row.pricingInputsSnapshot
	};
}

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

/** Replay charge using stored template id + frozen markup inputs (GRN cost read live). */
export async function computeSalePriceFromStoredSnapshot(input: {
	hospitalId: string;
	batchId: number;
	itemId: number;
	storeId: number;
	module: InvPricingModuleCode;
	templateId: number;
	pricingInputsSnapshot: PatientChargePricingInputsSnapshot;
}): Promise<SalePriceFormulaIssueResult> {
	const templateRow = await getPricingFormulaTemplateByIdDb(
		input.hospitalId,
		input.templateId
	);
	if (!templateRow) {
		throw error(400, 'Pricing formula template not found for replay');
	}

	const [store] = await ensureDb()
		.select({
			branchId: table.storeTable.branchId
		})
		.from(table.storeTable)
		.where(eq(table.storeTable.id, input.storeId))
		.limit(1);
	if (!store?.branchId) throw error(400, 'Store not found');

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
	if (!batch?.goodsReceiptLineId) {
		throw error(400, 'Batch has no goods receipt provenance for price replay');
	}

	const [grnLine] = await ensureDb()
		.select()
		.from(table.goodsReceiptLineTable)
		.where(eq(table.goodsReceiptLineTable.id, batch.goodsReceiptLineId))
		.limit(1);
	if (!grnLine) throw error(400, 'Goods receipt line not found');

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
		itemMarkupPercent: input.pricingInputsSnapshot.itemMarkupPercent,
		storeMarkupPercent: input.pricingInputsSnapshot.storeMarkupPercent,
		template: templateRow
	});

	return toIssueUnitPrices({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		purchaseUnitId: grnLine.unitId,
		unitPricePurchase: purchPrices.unitPricePurchase
	});
}

export type PatientChargeReplayResult = {
	storedUnitSalePriceIssue: string | null;
	recomputedUnitSalePriceIssue: string;
	matches: boolean;
};

export async function replayMedicationOrderLinePatientCharge(
	lineId: number
): Promise<PatientChargeReplayResult | null> {
	const mol = table.medicationOrderLineTable;
	const [line] = await ensureDb()
		.select({
			hospitalId: table.medicationOrderBatchTable.hospitalId,
			storeId: table.medicationOrderBatchTable.storeId,
			itemMasterId: mol.itemMasterId,
			pricingFormulaTemplateId: mol.pricingFormulaTemplateId,
			pricingModule: mol.pricingModule,
			pricingBatchId: mol.pricingBatchId,
			unitSalePriceIssue: mol.unitSalePriceIssue,
			pricingInputsSnapshot: mol.pricingInputsSnapshot
		})
		.from(mol)
		.innerJoin(
			table.medicationOrderBatchTable,
			eq(mol.batchId, table.medicationOrderBatchTable.id)
		)
		.where(eq(mol.id, lineId))
		.limit(1);
	if (!line) return null;
	if (
		line.pricingFormulaTemplateId == null ||
		line.pricingBatchId == null ||
		line.pricingModule == null
	) {
		return null;
	}
	const snap = parsePatientChargePricingInputsSnapshot(
		line.pricingInputsSnapshot
	);
	if (!snap) return null;

	const recomputed = await computeSalePriceFromStoredSnapshot({
		hospitalId: line.hospitalId,
		batchId: line.pricingBatchId,
		itemId: line.itemMasterId,
		storeId: line.storeId,
		module: line.pricingModule as InvPricingModuleCode,
		templateId: line.pricingFormulaTemplateId,
		pricingInputsSnapshot: snap
	});

	const stored =
		line.unitSalePriceIssue != null
			? toDbMoney2dp(line.unitSalePriceIssue)
			: null;
	const recomputedIssue = toDbMoney2dp(recomputed.unitSalePriceIssue);
	return {
		storedUnitSalePriceIssue: stored,
		recomputedUnitSalePriceIssue: recomputedIssue,
		matches:
			stored != null &&
			Math.abs(Number(stored) - Number(recomputedIssue)) < 0.005
	};
}

export async function countChargeSnapshotReferencesToTemplate(
	templateId: number
): Promise<number> {
	const db = ensureDb();
	const checks = [
		db
			.select({ id: table.medicationOrderLineTable.id })
			.from(table.medicationOrderLineTable)
			.where(
				eq(
					table.medicationOrderLineTable.pricingFormulaTemplateId,
					templateId
				)
			)
			.limit(1),
		db
			.select({ id: table.invDepartmentConsumptionLineTable.id })
			.from(table.invDepartmentConsumptionLineTable)
			.where(
				eq(
					table.invDepartmentConsumptionLineTable.pricingFormulaTemplateId,
					templateId
				)
			)
			.limit(1),
		db
			.select({ id: table.opBillingLineTable.id })
			.from(table.opBillingLineTable)
			.where(
				eq(table.opBillingLineTable.pricingFormulaTemplateId, templateId)
			)
			.limit(1),
		db
			.select({ id: table.ipBillingLineTable.id })
			.from(table.ipBillingLineTable)
			.where(
				eq(table.ipBillingLineTable.pricingFormulaTemplateId, templateId)
			)
			.limit(1)
	];
	for (const q of checks) {
		const [row] = await q;
		if (row) return 1;
	}
	return 0;
}
