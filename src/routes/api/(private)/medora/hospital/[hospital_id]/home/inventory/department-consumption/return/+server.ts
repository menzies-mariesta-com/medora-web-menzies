import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDepartmentConsumptionReturnSubmitted } from '$lib/server/medora/inventory/department-consumption.server';
import { parseUuid } from '$lib/server/medora/inventory/inv-validate.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id ?? '';
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	const visitId = parseUuid(body.visitId, 'visitId');

	const data = await createDepartmentConsumptionReturnSubmitted(event, {
		hospitalId,
		storeId: Number(body.storeId ?? 0),
		visitId,
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
