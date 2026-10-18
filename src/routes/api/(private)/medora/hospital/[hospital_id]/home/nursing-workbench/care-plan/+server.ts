import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as carePlan from '$lib/server/medora/clinical/nursing-care-plan.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	if (!visitId) throw error(400, 'visitId is required');
	return json(await carePlan.listCarePlanInstances({ hospitalId, visitId }));
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const visitId = parseUuid(body.visitId);
	const patientId = parseUuid(body.patientId);
	const branchId = parseUuid(body.branchId);
	if (!visitId || !patientId || !branchId) {
		throw error(400, 'visitId, patientId, and branchId are required');
	}
	return json({
		id: await carePlan.saveCarePlanInstance({
			hospitalId,
			branchId,
			patientId,
			visitId,
			id: body.id ? Number(body.id) : undefined,
			templateId:
				body.templateId != null ? Number(body.templateId) : null,
			contentJson: (body.contentJson as Record<string, unknown>) ?? {},
			sign: Boolean(body.sign),
			staffId
		})
	});
}
