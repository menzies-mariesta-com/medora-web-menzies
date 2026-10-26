import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { getOtScheduler } from '$lib/server/medora/operation-theatre/ot-booking.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const q = event.url.searchParams;
	return json(
		await getOtScheduler({
			hospitalId,
			branchId: q.get('branchId') || null,
			date: q.get('date') ?? new Date().toISOString().slice(0, 10),
			search: q.get('search') ?? undefined
		})
	);
}
