import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as imm from '$lib/server/medora/clinical/immunization.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'masters';
	const patientId = parseUuid(event.url.searchParams.get('patientId'));
	switch (mode) {
		case 'masters':
			return json(await imm.listImmunizationMasters());
		case 'patient.list':
			if (!patientId) throw error(400, 'patientId is required');
			return json(await imm.listPatientImmunizations({ hospitalId, patientId }));
		case 'patient.due':
			if (!patientId) throw error(400, 'patientId is required');
			return json(
				await imm.computeImmunizationDueList({
					patientId,
					dateOfBirth: event.url.searchParams.get('dob')
				})
			);
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const patientId = parseUuid(body.patientId);
	if (!patientId) throw error(400, 'patientId is required');
	return json(
		await imm.recordPatientImmunization({
			hospitalId,
			patientId,
			visitId: parseUuid(body.visitId) ?? null,
			immunizationMasterId: Number(body.immunizationMasterId ?? 0),
			administeredOn: String(body.administeredOn ?? ''),
			doseSequence: Number(body.doseSequence ?? 1),
			lotNumber: body.lotNumber != null ? String(body.lotNumber) : null,
			site: body.site != null ? String(body.site) : null,
			administratorStaffId:
				event.locals.staff?.id != null
					? String(event.locals.staff.id)
					: null,
			visGiven: Boolean(body.visGiven),
			remark: body.remark != null ? String(body.remark) : null
		})
	);
}
