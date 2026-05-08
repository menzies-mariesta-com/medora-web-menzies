import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createDepartmentConsumptionSubmitted,
	getDepartmentConsumptionById,
	listDepartmentConsumptions
} from '$lib/server/heka/inventory/department-consumption.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getDepartmentConsumptionById(event, { hospitalId, id });
		return json(row);
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const storeIdStr = event.url.searchParams.get('storeId');
	const statusIdStr = event.url.searchParams.get('statusTaggingId');
	const storeId =
		storeIdStr != null && storeIdStr !== '' ? Number(storeIdStr) : undefined;
	const statusTaggingId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : undefined;
	const consumptionNoRaw = event.url.searchParams.get('consumptionNo');
	const consumptionNo =
		consumptionNoRaw != null && consumptionNoRaw !== ''
			? consumptionNoRaw
			: undefined;

	const data = await listDepartmentConsumptions(event, {
		hospitalId,
		page,
		pageSize,
		storeId: Number.isFinite(storeId as number) ? storeId : undefined,
		statusTaggingId: Number.isFinite(statusTaggingId as number)
			? statusTaggingId
			: undefined,
		consumptionNo
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];

	const data = await createDepartmentConsumptionSubmitted(event, {
		hospitalId,
		storeId: Number(body.storeId ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null,
		lines: lines.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0),
			batchId: Number(l.batchId ?? 0),
			remarks: l.remarks != null ? String(l.remarks) : null
		}))
	});

	return json(data);
};
