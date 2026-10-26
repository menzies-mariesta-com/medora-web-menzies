import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { getOtOptions } from '$lib/server/medora/operation-theatre/ot-options.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await getOtOptions({
			hospitalId,
			branchId: event.url.searchParams.get('branchId') || null,
			currentStaffId: event.locals.staff?.id ?? null
		})
	);
}
