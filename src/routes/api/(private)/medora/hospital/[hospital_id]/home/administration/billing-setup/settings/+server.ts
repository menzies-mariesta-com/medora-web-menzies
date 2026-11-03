import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	buildBillingBillContext,
	parseVisitOpenModeFromBody
} from '$lib/server/medora/billing/billing-bill-context.server';
import {
	getVisitOpenMode,
	upsertVisitOpenMode
} from '$lib/server/medora/billing/hospital-billing-setting.server';

function hospitalIdFrom(params: { hospital_id?: string }): string {
	const hid = params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = hospitalIdFrom(event.params);
	await ensureCanAccessHospital(event, hospitalId);
	const visitOpenMode = await getVisitOpenMode(hospitalId);
	return json({ visitOpenMode });
};

export const PATCH: RequestHandler = async (event) => {
	const hospitalId = hospitalIdFrom(event.params);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const visitOpenMode = parseVisitOpenModeFromBody(body);
	const saved = await upsertVisitOpenMode({ hospitalId, visitOpenMode });
	return json({ visitOpenMode: saved });
};
