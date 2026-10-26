import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	cancelOtRequest,
	createOtRequest,
	listOtRequestVisits,
	listOtRequests,
	updateOtRequest
} from '$lib/server/medora/operation-theatre/ot-request.server';

function hospitalIdFrom(event: RequestEvent): string {
	return event.params.hospital_id ?? '';
}

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
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'visits') {
		return json(
			await listOtRequestVisits({
				hospitalId,
				search: event.url.searchParams.get('search') ?? undefined,
				visitId: event.url.searchParams.get('visitId'),
				limit: numberOrNull(event.url.searchParams.get('limit')) ?? 20
			})
		);
	}
	return json(
		await listOtRequests({
			hospitalId,
			branchId: stringOrNull(event.url.searchParams.get('branchId')),
			page: numberOrNull(event.url.searchParams.get('page')) ?? 1,
			pageSize:
				numberOrNull(event.url.searchParams.get('pageSize')) ?? 10,
			search: event.url.searchParams.get('search') ?? undefined,
			scope:
				(event.url.searchParams.get('scope') as
					| 'pending'
					| 'booked'
					| 'all'
					| null) ?? 'pending'
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Body required');
	const action = String(body.action ?? 'create');
	const staffId = event.locals.staff?.id ?? null;

	if (action === 'create') {
		return json(
			await createOtRequest({
				hospitalId,
				visitId: String(body.visitId ?? ''),
				staffId,
				procedureName: String(body.procedureName ?? ''),
				serviceId: numberOrNull(body.serviceId),
				surgeonId: stringOrNull(body.surgeonId),
				paediatricianId: stringOrNull(body.paediatricianId),
				providerId: stringOrNull(body.providerId),
				provisionalDiagnosis: stringOrNull(body.provisionalDiagnosis),
				otRequestDate: stringOrNull(body.otRequestDate),
				durationMinutes: numberOrNull(body.durationMinutes),
				priority: String(body.priority ?? 'elective'),
				notes: stringOrNull(body.notes)
			})
		);
	}
	if (action === 'update') {
		return json(
			await updateOtRequest({
				hospitalId,
				id: Number(body.id),
				procedureName: String(body.procedureName ?? ''),
				serviceId: numberOrNull(body.serviceId),
				surgeonId: stringOrNull(body.surgeonId),
				paediatricianId: stringOrNull(body.paediatricianId),
				providerId: stringOrNull(body.providerId),
				provisionalDiagnosis: stringOrNull(body.provisionalDiagnosis),
				otRequestDate: stringOrNull(body.otRequestDate),
				durationMinutes: numberOrNull(body.durationMinutes),
				priority: String(body.priority ?? 'elective'),
				notes: stringOrNull(body.notes)
			})
		);
	}
	if (action === 'cancel') {
		return json(
			await cancelOtRequest({
				hospitalId,
				id: Number(body.id),
				staffId
			})
		);
	}
	throw error(400, 'Unknown action');
}
