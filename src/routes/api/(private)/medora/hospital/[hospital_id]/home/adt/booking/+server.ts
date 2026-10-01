import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as booking from '$lib/server/medora/adt/booking.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const search = event.url.searchParams.get('search') ?? undefined;
	const statusRaw = event.url.searchParams.get('statusTaggingId');
	const statusTaggingId =
		statusRaw != null && statusRaw !== ''
			? Number(statusRaw)
			: undefined;
	return json(
		await booking.getBookingsPaginated({
			hospitalId,
			page,
			pageSize,
			search,
			statusTaggingId: Number.isFinite(statusTaggingId as number)
				? statusTaggingId
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const action = String(body.action ?? 'create');

	if (action === 'cancel') {
		const id = Number(body.id);
		if (!Number.isFinite(id) || id <= 0)
			throw error(400, 'id is required');
		return json(await booking.cancelBooking({ hospitalId, id }));
	}

	return json(
		await booking.createBooking({
			hospitalId,
			branchId: String(body.branchId ?? ''),
			patientId: body.patientId ?? null,
			patientTitleId:
				body.patientTitleId != null
					? Number(body.patientTitleId)
					: null,
			patientName: body.patientName ?? null,
			patientDateOfBirth: body.patientDateOfBirth ?? null,
			patientAgeYear:
				body.patientAgeYear != null
					? Number(body.patientAgeYear)
					: null,
			patientAgeMonth:
				body.patientAgeMonth != null
					? Number(body.patientAgeMonth)
					: null,
			patientAgeDay:
				body.patientAgeDay != null
					? Number(body.patientAgeDay)
					: null,
			phone: body.phone ?? null,
			email: body.email ?? null,
			preferredWardId:
				body.preferredWardId != null && body.preferredWardId !== ''
					? Number(body.preferredWardId)
					: null,
			preferredBedId:
				body.preferredBedId != null && body.preferredBedId !== ''
					? Number(body.preferredBedId)
					: null,
			expectedAdmitAt: body.expectedAdmitAt ?? null,
			admittingDoctorId: body.admittingDoctorId ?? null,
			remark: body.remark ?? null
		})
	);
}
