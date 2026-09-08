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
		mslMarkupPercent: row.mslMarkupPercent,
		slotOrder: parseSlotOrder(row.slotOrder),
		isSystemDefault: row.isSystemDefault,
		statusId: row.statusId
	};
}

function parseMarkupPercent(raw: string, label: string): string {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0 || n > 999) {
		throw error(400, `Invalid ${label}`);
	}
	return n.toFixed(2);
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
	event: RequestEvent,
	input: {
		hospitalId: string;
		id: number;
	} & Partial<PricingFormulaTemplateWriteInput>
): Promise<PricingFormulaTemplateDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const existing = await getPricingFormulaTemplate(event, {
		hospitalId: input.hospitalId,
		id: input.id
	});
	if (!existing) throw error(404, 'Template not found');

	const payload = templateWritePayload({
		name: input.name ?? existing.name,
		description:
			input.description !== undefined
				? input.description
				: existing.description,
		includeDiscount: input.includeDiscount ?? existing.includeDiscount,
		includeTax: input.includeTax ?? existing.includeTax,
		includeFreeQty: input.includeFreeQty ?? existing.includeFreeQty,
		includeItemMarkup:
			input.includeItemMarkup ?? existing.includeItemMarkup,
		includeStoreMarkup:
			input.includeStoreMarkup ?? existing.includeStoreMarkup,
		mslMarkupPercent:
			input.mslMarkupPercent ?? existing.mslMarkupPercent,
		statusId: input.statusId ?? existing.statusId
	});

	const [row] = await ensureDb()
		.update(table.invPricingFormulaTemplateTable)
		.set(payload)
		.where(
			and(
				eq(table.invPricingFormulaTemplateTable.id, input.id),
				eq(
					table.invPricingFormulaTemplateTable.hospitalId,
					input.hospitalId
				)
			)
		)
		.returning();
	if (!row) throw error(500, 'Template update failed');
	return rowToPricingFormulaTemplateDto(row);
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
			formulaVersion: src.formulaVersion,
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
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [row] = await ensureDb()
		.select({
			id: table.invPricingFormulaTemplateTable.id,
			isSystemDefault: table.invPricingFormulaTemplateTable.isSystemDefault
		})
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
	if (!row) throw error(404, 'Template not found');
	if (row.isSystemDefault) {
		throw error(400, 'Cannot delete the system default template');
	}

	const [used] = await ensureDb()
		.select({ id: table.invModulePricingAssignmentTable.id })
		.from(table.invModulePricingAssignmentTable)
		.where(
			eq(
				table.invModulePricingAssignmentTable.formulaTemplateId,
				input.id
			)
		)
		.limit(1);
	if (used) {
		throw error(
			400,
			'Template is assigned to one or more branch/module scopes'
		);
	}

	await ensureDb()
		.delete(table.invPricingFormulaTemplateTable)
		.where(eq(table.invPricingFormulaTemplateTable.id, input.id));
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
