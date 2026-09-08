import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	INV_PRICING_MODULE_CODES,
	type InvPricingModuleCode
} from '$lib/model/type/medora/inv-pricing-module.type';
import type {
	ModulePricingAssignmentDto,
	ModulePricingAssignmentOverviewRow
} from '$lib/model/type/medora/pricing-formula-template.type';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';
import { getPricingFormulaTemplate } from './pricing-formula-template.server';

function assertModuleCode(module: string): InvPricingModuleCode {
	if (
		!INV_PRICING_MODULE_CODES.includes(module as InvPricingModuleCode)
	) {
		throw error(400, 'Invalid pricing module');
	}
	return module as InvPricingModuleCode;
}

function rowToAssignmentDto(
	row: typeof table.invModulePricingAssignmentTable.$inferSelect
): ModulePricingAssignmentDto {
	return {
		id: row.id,
		hospitalId: row.hospitalId,
		branchId: row.branchId,
		module: assertModuleCode(row.module),
		formulaTemplateId: row.formulaTemplateId
	};
}

export async function getModulePricingAssignment(
	event: RequestEvent,
	input: {
		hospitalId: string;
		branchId: string;
		module: InvPricingModuleCode;
	}
): Promise<ModulePricingAssignmentDto | null> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [row] = await ensureDb()
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
	return row ? rowToAssignmentDto(row) : null;
}

export async function listModulePricingAssignmentOverview(
	event: RequestEvent,
	input: {
		hospitalId: string;
		branchId?: string;
		module?: InvPricingModuleCode;
	}
): Promise<ModulePricingAssignmentOverviewRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const [hospital] = await ensureDb()
		.select({
			id: table.hospitalTable.id,
			name: table.hospitalTable.name
		})
		.from(table.hospitalTable)
		.where(eq(table.hospitalTable.id, input.hospitalId))
		.limit(1);
	if (!hospital) throw error(404, 'Hospital not found');

	const branchConditions = [
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId)
	];
	if (input.branchId?.trim()) {
		branchConditions.push(
			eq(table.hospitalBranchTable.id, input.branchId.trim())
		);
	}

	const branchRows = await ensureDb()
		.select({
			id: table.hospitalBranchTable.id,
			name: table.hospitalBranchTable.name,
			code: table.hospitalBranchTable.code
		})
		.from(table.hospitalBranchTable)
		.where(and(...branchConditions))
		.orderBy(table.hospitalBranchTable.name);

	const modules = input.module
		? [input.module]
		: [...INV_PRICING_MODULE_CODES];

	const assignmentRows = await ensureDb()
		.select({
			assignment: table.invModulePricingAssignmentTable,
			templateName: table.invPricingFormulaTemplateTable.name
		})
		.from(table.invModulePricingAssignmentTable)
		.innerJoin(
			table.invPricingFormulaTemplateTable,
			eq(
				table.invModulePricingAssignmentTable.formulaTemplateId,
				table.invPricingFormulaTemplateTable.id
			)
		)
		.where(
			eq(
				table.invModulePricingAssignmentTable.hospitalId,
				input.hospitalId
			)
		);

	const assignmentByKey = new Map<
		string,
		(typeof assignmentRows)[number]
	>();
	for (const row of assignmentRows) {
		const key = `${row.assignment.branchId}:${row.assignment.module}`;
		assignmentByKey.set(key, row);
	}

	const overview: ModulePricingAssignmentOverviewRow[] = [];
	for (const branch of branchRows) {
		const branchName =
			branch.name?.trim() || branch.code?.trim() || branch.id;
		for (const mod of modules) {
			const key = `${branch.id}:${mod}`;
			const hit = assignmentByKey.get(key);
			overview.push({
				hospitalId: hospital.id,
				hospitalName: hospital.name ?? hospital.id,
				branchId: branch.id,
				branchName,
				module: mod,
				assignmentId: hit?.assignment.id ?? null,
				formulaTemplateId: hit?.assignment.formulaTemplateId ?? null,
				formulaTemplateName: hit?.templateName ?? null
			});
		}
	}

	return overview;
}

export async function upsertModulePricingAssignment(
	event: RequestEvent,
	input: {
		hospitalId: string;
		branchId: string;
		module: InvPricingModuleCode;
		formulaTemplateId: number;
	}
): Promise<ModulePricingAssignmentDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	if (!input.branchId?.trim()) throw error(400, 'branchId required');

	const template = await getPricingFormulaTemplate(event, {
		hospitalId: input.hospitalId,
		id: input.formulaTemplateId
	});
	if (!template) throw error(400, 'Invalid formula template');

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

	const [existing] = await ensureDb()
		.select({ id: table.invModulePricingAssignmentTable.id })
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

	if (existing) {
		const [row] = await ensureDb()
			.update(table.invModulePricingAssignmentTable)
			.set({ formulaTemplateId: input.formulaTemplateId })
			.where(eq(table.invModulePricingAssignmentTable.id, existing.id))
			.returning();
		if (!row) throw error(500, 'Assignment update failed');
		return rowToAssignmentDto(row);
	}

	const [row] = await ensureDb()
		.insert(table.invModulePricingAssignmentTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			module: input.module,
			formulaTemplateId: input.formulaTemplateId
		})
		.returning();
	if (!row) throw error(500, 'Assignment insert failed');
	return rowToAssignmentDto(row);
}
