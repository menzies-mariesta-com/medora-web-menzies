import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	DEFAULT_PRICING_FORMULA_SLOT_ORDER,
	type PricingFormulaSlot,
	type PricingFormulaTemplateDto,
	type PricingFormulaTemplateListRow
} from '$lib/model/type/medora/pricing-formula-template.type';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';
import { requireMoneyDecimal2dp } from '$lib/server/medora/money-field.server';
import { toDbMoney2dp } from '$lib/server/medora/money-normalize.server';

function parseSlotOrder(raw: unknown): PricingFormulaSlot[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [...DEFAULT_PRICING_FORMULA_SLOT_ORDER];
	}
	const allowed = new Set<PricingFormulaSlot>([
		'COST',
		'MSL',
		'ITEM',
		'STORE'
	]);
	const out: PricingFormulaSlot[] = [];
	for (const v of raw) {
		if (typeof v === 'string' && allowed.has(v as PricingFormulaSlot)) {
			out.push(v as PricingFormulaSlot);
		}
	}
	return out.length > 0 ? out : [...DEFAULT_PRICING_FORMULA_SLOT_ORDER];
}

export function rowToPricingFormulaTemplateDto(
	row: typeof table.invPricingFormulaTemplateTable.$inferSelect
): PricingFormulaTemplateDto {
	return {
		id: row.id,
		hospitalId: row.hospitalId,
		name: row.name,
		description: row.description,
		formulaVersion: row.formulaVersion,
		includeDiscount: row.includeDiscount,
		includeTax: row.includeTax,
		includeFreeQty: row.includeFreeQty,
		includeItemMarkup: row.includeItemMarkup,
		includeStoreMarkup: row.includeStoreMarkup,
		mslMarkupPercent: row.mslMarkupPercent != null ? toDbMoney2dp(row.mslMarkupPercent) : row.mslMarkupPercent,
		slotOrder: parseSlotOrder(row.slotOrder),
		isSystemDefault: row.isSystemDefault,
		statusId: row.statusId
	};
}

function parseMarkupPercent(raw: string, label: string): string {
	try {
		const fixed = requireMoneyDecimal2dp(raw, label, {
			allowNegative: false
		});
		if (Number(fixed) > 999) {
			throw error(400, `Invalid ${label}`);
		}
		return fixed;
	} catch {
		throw error(400, `Invalid ${label}`);
	}
}

export type PricingFormulaTemplateWriteInput = {
	name: string;
	description?: string | null;
	includeDiscount?: boolean;
	includeTax?: boolean;
	includeFreeQty?: boolean;
	includeItemMarkup?: boolean;
	includeStoreMarkup?: boolean;
	mslMarkupPercent?: string;
	statusId?: number;
};

function templateWritePayload(input: PricingFormulaTemplateWriteInput) {
	return {
		name: input.name.trim(),
		description: input.description?.trim() || null,
		includeDiscount: input.includeDiscount ?? true,
		includeTax: input.includeTax ?? true,
		includeFreeQty: input.includeFreeQty ?? false,
		includeItemMarkup: input.includeItemMarkup ?? true,
		includeStoreMarkup: input.includeStoreMarkup ?? true,
		mslMarkupPercent: parseMarkupPercent(
			input.mslMarkupPercent ?? '0',
			'MSL markup percent'
		),
		statusId: input.statusId ?? StatusEnum.ACTIVE
	};
}

export async function listPricingFormulaTemplates(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<PricingFormulaTemplateListRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const rows = await ensureDb()
		.select({
			template: table.invPricingFormulaTemplateTable,
			assignmentCount: count(table.invModulePricingAssignmentTable.id)
		})
		.from(table.invPricingFormulaTemplateTable)
		.leftJoin(
			table.invModulePricingAssignmentTable,
			eq(
				table.invModulePricingAssignmentTable.formulaTemplateId,
				table.invPricingFormulaTemplateTable.id
			)
		)
		.where(
			eq(
				table.invPricingFormulaTemplateTable.hospitalId,
				input.hospitalId
			)
		)
		.groupBy(table.invPricingFormulaTemplateTable.id)
		.orderBy(table.invPricingFormulaTemplateTable.name);

	return rows.map((r) => ({
		...rowToPricingFormulaTemplateDto(r.template),
		assignmentCount: Number(r.assignmentCount)
	}));
}

export async function getPricingFormulaTemplate(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<PricingFormulaTemplateDto | null> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [row] = await ensureDb()
		.select()
		.from(table.invPricingFormulaTemplateTable)
		.where(
			and(
				eq(table.invPricingFormulaTemplateTable.id, input.id),
				eq(
					table.invPricingFormulaTemplateTable.hospitalId,
					input.hospitalId
				)
			)
		)
		.limit(1);
	return row ? rowToPricingFormulaTemplateDto(row) : null;
}

export async function getPricingFormulaTemplateByIdDb(
	hospitalId: string,
	id: number
): Promise<PricingFormulaTemplateDto | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.invPricingFormulaTemplateTable)
		.where(
			and(
				eq(table.invPricingFormulaTemplateTable.id, id),
				eq(table.invPricingFormulaTemplateTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	return row ? rowToPricingFormulaTemplateDto(row) : null;
}

export async function createPricingFormulaTemplate(
	event: RequestEvent,
	input: { hospitalId: string } & PricingFormulaTemplateWriteInput
): Promise<PricingFormulaTemplateDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const payload = templateWritePayload(input);
	if (!payload.name) throw error(400, 'Template name is required');

	const [row] = await ensureDb()
		.insert(table.invPricingFormulaTemplateTable)
		.values({
			hospitalId: input.hospitalId,
			...payload
		})
		.returning();
	if (!row) throw error(500, 'Template insert failed');
	return rowToPricingFormulaTemplateDto(row);
}

export async function updatePricingFormulaTemplate(
	_event: RequestEvent,
	_input: {
		hospitalId: string;
		id: number;
	} & Partial<PricingFormulaTemplateWriteInput>
): Promise<PricingFormulaTemplateDto> {
	throw error(
		403,
		'Pricing formula templates are immutable. Duplicate a template to create a new revision.'
	);
}

export async function duplicatePricingFormulaTemplate(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<PricingFormulaTemplateDto> {
	const src = await getPricingFormulaTemplate(event, {
		hospitalId: input.hospitalId,
		id: input.id
	});
	if (!src) throw error(404, 'Template not found');

	let name = `Copy of ${src.name}`;
	const [conflict] = await ensureDb()
		.select({ id: table.invPricingFormulaTemplateTable.id })
		.from(table.invPricingFormulaTemplateTable)
		.where(
			and(
				eq(
					table.invPricingFormulaTemplateTable.hospitalId,
					input.hospitalId
				),
				eq(table.invPricingFormulaTemplateTable.name, name)
			)
		)
		.limit(1);
	if (conflict) {
		name = `${name} (${Date.now()})`;
	}

	const [row] = await ensureDb()
		.insert(table.invPricingFormulaTemplateTable)
		.values({
			hospitalId: input.hospitalId,
			name,
			description: src.description,
			formulaVersion: src.formulaVersion + 1,
			includeDiscount: src.includeDiscount,
			includeTax: src.includeTax,
			includeFreeQty: src.includeFreeQty,
			includeItemMarkup: src.includeItemMarkup,
			includeStoreMarkup: src.includeStoreMarkup,
			mslMarkupPercent: src.mslMarkupPercent,
			slotOrder: src.slotOrder,
			isSystemDefault: false,
			statusId: src.statusId
		})
		.returning();
	if (!row) throw error(500, 'Template duplicate failed');
	return rowToPricingFormulaTemplateDto(row);
}

export async function deletePricingFormulaTemplate(
	event: RequestEvent,
	_input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureHospitalInventoryAccess(event, _input.hospitalId);
	throw error(
		403,
		'Pricing formula templates cannot be deleted. Duplicate a template to create a new revision.'
	);
}

export async function deactivatePricingFormulaTemplate(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<PricingFormulaTemplateDto> {
	return updatePricingFormulaTemplate(event, {
		hospitalId: input.hospitalId,
		id: input.id,
		statusId: StatusEnum.INACTIVE
	});
}
