import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { requireClinicalStaff } from '$lib/server/medora/clinical/clinical-authority.server';
import { listConsultationWorkspace } from '$lib/server/medora/clinical/workspace.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staff = requireClinicalStaff(event);
	return json(
		await listConsultationWorkspace({
			hospitalId,
			staffId: staff.id,
			staffTypeId: staff.staffTypeId
		})
	);
}
