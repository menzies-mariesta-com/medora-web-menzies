import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelDepartmentConsumption } from '$lib/server/heka/inventory/department-consumption.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await cancelDepartmentConsumption(event, {
		hospitalId,
		consumptionId: String(body.consumptionId ?? ''),
		reason: String(body.reason ?? '')
	});
	return json(data);
};
