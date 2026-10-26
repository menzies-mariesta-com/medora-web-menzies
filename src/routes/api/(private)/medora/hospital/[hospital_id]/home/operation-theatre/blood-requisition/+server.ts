import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	createOtBloodRequisition,
	listOtBloodRequisitions
} from '$lib/server/medora/operation-theatre/ot-blood-requisition.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const caseId = Number(event.url.searchParams.get('caseId'));
	if (!Number.isFinite(caseId))
		throw error(400, 'caseId is required');
	return json(await listOtBloodRequisitions({ hospitalId, caseId }));
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Body required');
	return json(
		await createOtBloodRequisition({
			hospitalId,
			caseId: Number(body.caseId),
			bloodGroup: body.bloodGroup ? String(body.bloodGroup) : null,
			component: String(body.component ?? ''),
			units: Number(body.units ?? 1),
			urgency: String(body.urgency ?? 'routine'),
			notes: body.notes ? String(body.notes) : null,
			staffId: event.locals.staff?.id ?? null
		})
	);
}
