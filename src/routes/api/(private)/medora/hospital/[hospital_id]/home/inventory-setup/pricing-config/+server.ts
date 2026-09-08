import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	INV_PRICING_MODULE_CODES,
	type InvPricingModuleCode
} from '$lib/model/type/medora/inv-pricing-module.type';
import {
	getModulePricingAssignment,
	listModulePricingAssignmentOverview,
	upsertModulePricingAssignment
} from '$lib/server/medora/inventory/pricing-formula-assignment.server';
import { getPricingFormulaTemplate } from '$lib/server/medora/inventory/pricing-formula-template.server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { previewSalePrice } from '$lib/server/medora/inventory/sale-price.server';

function parseModule(raw: string | null): InvPricingModuleCode {
	if (
		raw &&
		INV_PRICING_MODULE_CODES.includes(raw as InvPricingModuleCode)
	) {
		return raw as InvPricingModuleCode;
	}
	throw error(400, 'module required (IS, ES, or DC)');
}

function parseOptionalModule(
	raw: string | null
): InvPricingModuleCode | undefined {
	if (!raw?.trim()) return undefined;
	return parseModule(raw.trim());
}

async function resolveBranchIdFromStore(
	hospitalId: string,
	storeId: number
): Promise<string> {
	const [store] = await ensureDb()
		.select({ branchId: table.storeTable.branchId })
		.from(table.storeTable)
		.where(eq(table.storeTable.id, storeId))
		.limit(1);
	if (!store?.branchId) throw error(400, 'Store not found');
	return store.branchId;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode');

	if (mode === 'overview') {
		const branchId = event.url.searchParams.get('branchId')?.trim();
		const module = parseOptionalModule(
			event.url.searchParams.get('module')
		);
		const rows = await listModulePricingAssignmentOverview(event, {
			hospitalId,
			branchId: branchId || undefined,
			module
		});
		return json({ data: rows });
	}

	const branchIdParam = event.url.searchParams.get('branchId')?.trim();
	const storeIdRaw = event.url.searchParams.get('storeId');
	const storeId =
		storeIdRaw != null && storeIdRaw !== '' ? Number(storeIdRaw) : NaN;
	let branchId = branchIdParam;
	if (!branchId) {
		if (!Number.isFinite(storeId)) {
			throw error(400, 'branchId or storeId required');
		}
		branchId = await resolveBranchIdFromStore(hospitalId, storeId);
	}

	const module = event.url.searchParams.get('module');
	if (!module?.trim()) {
		throw error(400, 'module required (IS, ES, or DC)');
	}

	const mod = parseModule(module);
	const assignment = await getModulePricingAssignment(event, {
		hospitalId,
		branchId,
		module: mod
	});
	const template =
		assignment != null
			? await getPricingFormulaTemplate(event, {
					hospitalId,
					id: assignment.formulaTemplateId
				})
			: null;

	return json({ assignment, template });
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON');

	const branchId = String(body.branchId ?? '').trim();
	if (!branchId) throw error(400, 'branchId required');
	const mod = parseModule(
		body.module != null ? String(body.module) : null
	);
	const formulaTemplateId = Number(body.formulaTemplateId);
	if (!Number.isFinite(formulaTemplateId)) {
		throw error(400, 'formulaTemplateId required');
	}

	const assignment = await upsertModulePricingAssignment(event, {
		hospitalId,
		branchId,
		module: mod,
		formulaTemplateId
	});
	const template = await getPricingFormulaTemplate(event, {
		hospitalId,
		id: assignment.formulaTemplateId
	});
	return json({ assignment, template });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const action = event.url.searchParams.get('action');
	if (action !== 'preview') {
		throw error(400, 'Unsupported action');
	}

	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON');

	const mod = parseModule(
		body.module != null ? String(body.module) : null
	);
	const batchId = Number(body.batchId);
	const itemId = Number(body.itemId);
	const storeId = Number(body.storeId);
	if (!Number.isFinite(batchId) || !Number.isFinite(itemId)) {
		throw error(400, 'batchId and itemId required');
	}
	if (!Number.isFinite(storeId)) {
		throw error(400, 'storeId required');
	}
	const templateIdRaw = body.templateId;
	const templateId =
		templateIdRaw != null && templateIdRaw !== ''
			? Number(templateIdRaw)
			: undefined;

	const result = await previewSalePrice(event, {
		hospitalId,
		batchId,
		itemId,
		storeId,
		module: mod,
		templateId: Number.isFinite(templateId as number)
			? templateId
			: undefined
	});
	return json(result);
};
