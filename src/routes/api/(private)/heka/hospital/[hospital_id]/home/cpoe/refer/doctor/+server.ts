import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as appointment from '$lib/server/heka/appointment/appointment.server';
import { createReferHistory } from '$lib/server/heka/cpoe/refer-history.server';
import type { ReferHistorySchemaInsert } from '$lib/server/db/schema-type';

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
		case 'doctor.search': {
			const search = event.url.searchParams.get('search') ?? '';
			const branchId = event.url.searchParams.get('branchId') ?? undefined;
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
			return json(
				await appointment.getDoctorStaffPaginated(event, {
					hospitalId,
					branchId,
					search,
					page,
					pageSize
				})
			);
		}
		case 'doctor.get': {
			const id = event.url.searchParams.get('id') ?? '';
			if (!id) throw error(400, 'id is required');
			return json(
				await appointment.getDoctorByIdWithRelations(event, {
					hospitalId,
					id
				})
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request.json().catch(() => null)) as any;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'referHistory.create': {
			const payload = body?.payload as ReferHistorySchemaInsert | null;
			if (!payload) throw error(400, 'payload is required');
			return json(await createReferHistory(event, hospitalId, payload));
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

