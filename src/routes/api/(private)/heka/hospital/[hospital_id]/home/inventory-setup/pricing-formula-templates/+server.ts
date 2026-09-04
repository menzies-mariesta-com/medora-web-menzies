import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createPricingFormulaTemplate,
	deactivatePricingFormulaTemplate,
	deletePricingFormulaTemplate,
	duplicatePricingFormulaTemplate,
	getPricingFormulaTemplate,
	listPricingFormulaTemplates,
	updatePricingFormulaTemplate,
	type PricingFormulaTemplateWriteInput
} from '$lib/server/heka/inventory/pricing-formula-template.server';

function writeInputFromBody(
	body: Record<string, unknown>
): PricingFormulaTemplateWriteInput {
	return {
		name: String(body.name ?? ''),
		description:
			body.description != null ? String(body.description) : null,
		includeDiscount: body.includeDiscount as boolean | undefined,
		includeTax: body.includeTax as boolean | undefined,
		includeFreeQty: body.includeFreeQty as boolean | undefined,
		includeItemMarkup: body.includeItemMarkup as boolean | undefined,
		includeStoreMarkup: body.includeStoreMarkup as boolean | undefined,
		mslMarkupPercent:
			body.mslMarkupPercent != null
				? String(body.mslMarkupPercent)
				: undefined,
		statusId:
			body.statusId != null && body.statusId !== ''
				? Number(body.statusId)
				: undefined
	};
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const idStr = event.url.searchParams.get('id');

	if (idStr) {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		const row = await getPricingFormulaTemplate(event, {
			hospitalId,
			id
		});
		return json(row);
	}
	const rows = await listPricingFormulaTemplates(event, { hospitalId });
	return json({ data: rows });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const action = event.url.searchParams.get('action');
	const idStr = event.url.searchParams.get('id');

	if (action === 'duplicate') {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'id required');
		const row = await duplicatePricingFormulaTemplate(event, {
			hospitalId,
			id
		});
		return json(row);
	}

	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON');
	const row = await createPricingFormulaTemplate(event, {
		hospitalId,
		...writeInputFromBody(body)
	});
	return json(row);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const action = event.url.searchParams.get('action');
	const idStr = event.url.searchParams.get('id');
	const id = Number(idStr);
	if (!Number.isFinite(id)) throw error(400, 'id required');

	if (action === 'deactivate') {
		const row = await deactivatePricingFormulaTemplate(event, {
			hospitalId,
			id
		});
		return json(row);
	}

	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON');
	const row = await updatePricingFormulaTemplate(event, {
		hospitalId,
		id,
		...writeInputFromBody(body)
	});
	return json(row);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id)) throw error(400, 'id required');
	await deletePricingFormulaTemplate(event, { hospitalId, id });
	return json({ ok: true });
};
