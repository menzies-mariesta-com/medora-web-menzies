import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { getLabDashboardStats } from '$lib/server/medora/diagnostics/lab-worklist.server';
import { getOrCreateHospitalLabSetting } from '$lib/server/medora/diagnostics/hospital-lab-setting.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const [stats, setting] = await Promise.all([
		getLabDashboardStats(hospitalId),
		getOrCreateHospitalLabSetting(hospitalId)
	]);
	return json({ stats, setting });
}
