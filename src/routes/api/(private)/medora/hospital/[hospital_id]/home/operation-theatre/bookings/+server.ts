import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	bookOtRequest,
	changeOtBookingStatus,
	getOtBookingById,
	listOtBookings,
	saveOtClinicalDetails,
	tagOtPatient
} from '$lib/server/medora/operation-theatre/ot-booking.server';

function numberOrNull(value: unknown): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function stringOrNull(value: unknown): string | null {
	if (value == null) return null;
	const s = String(value).trim();
	return s ? s : null;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const q = event.url.searchParams;
	if (q.get('mode') === 'detail') {
		const caseId = numberOrNull(q.get('caseId'));
		if (!caseId) throw error(400, 'caseId is required');
		return json(await getOtBookingById({ hospitalId, caseId }));
	}
	return json(
		await listOtBookings({
			hospitalId,
			branchId: stringOrNull(q.get('branchId')),
			otRoomId: numberOrNull(q.get('otRoomId')),
			dateFrom: stringOrNull(q.get('dateFrom')),
			dateTo: stringOrNull(q.get('dateTo')),
			providerId: stringOrNull(q.get('providerId')),
			status: stringOrNull(q.get('status')),
			searchOn: stringOrNull(q.get('searchOn')),
			search: stringOrNull(q.get('search')),
			page: numberOrNull(q.get('page')) ?? 1,
			pageSize: numberOrNull(q.get('pageSize')) ?? 10
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Body required');
	const action = String(body.action ?? 'book');
	const staffId = event.locals.staff?.id ?? null;

	if (action === 'book') {
		return json(
			await bookOtRequest({
				hospitalId,
				caseId: Number(body.caseId),
				otRoomId: Number(body.otRoomId),
				scheduledStart: String(body.scheduledStart ?? ''),
				scheduledEnd: String(body.scheduledEnd ?? ''),
				staffId,
				notes: stringOrNull(body.notes)
			})
		);
	}
	if (action === 'status') {
		return json(
			await changeOtBookingStatus({
				hospitalId,
				caseId: Number(body.caseId),
				statusTaggingId: Number(body.statusTaggingId),
				staffId,
				reason: stringOrNull(body.reason)
			})
		);
	}
	if (action === 'tag') {
		return json(
			await tagOtPatient({
				hospitalId,
				caseId: Number(body.caseId),
				staffId,
				notes: stringOrNull(body.notes)
			})
		);
	}
	if (action === 'details') {
		return json(
			await saveOtClinicalDetails({
				hospitalId,
				caseId: Number(body.caseId),
				provisionalDiagnosis: stringOrNull(body.provisionalDiagnosis),
				clinicalNotes: stringOrNull(body.clinicalNotes),
				surgeonId: stringOrNull(body.surgeonId),
				paediatricianId: stringOrNull(body.paediatricianId),
				providerId: stringOrNull(body.providerId),
				durationMinutes: numberOrNull(body.durationMinutes),
				staffId
			})
		);
	}
	throw error(400, 'Unknown action');
}
