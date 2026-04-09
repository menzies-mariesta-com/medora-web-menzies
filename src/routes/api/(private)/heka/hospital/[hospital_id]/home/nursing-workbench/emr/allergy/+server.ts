import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'visit.get': {
			const visitId = Number(event.url.searchParams.get('visitId') ?? '0');
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getPatientVisitById({ id: visitId, hospitalId }));
		}
		case 'allergy.listPaginated': {
			const patientId = event.url.searchParams.get('patientId') ?? '';
			if (!patientId) throw error(400, 'patientId is required');
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
			const visitNo = event.url.searchParams.get('visitNo') ?? undefined;
			const severityName = event.url.searchParams.get('severityName') ?? undefined;
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== '' ? Number(statusIdRaw) : undefined;
			return json(
				await obs.getPatientAllergiesByPatientIdWithRelationsPaginated({
					patientId,
					hospitalId,
					page,
					pageSize,
					visitNo,
					severityName,
					statusId
				})
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	await obs.deletePatientAllergies({ id });
	return json({ ok: true });
}

