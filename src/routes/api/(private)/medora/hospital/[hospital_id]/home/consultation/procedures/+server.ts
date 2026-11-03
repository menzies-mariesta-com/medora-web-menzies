import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { requireClinicalStaff } from '$lib/server/medora/clinical/clinical-authority.server';
import * as procedure from '$lib/server/medora/clinical/procedure.server';
import { parseUuid } from '$lib/util/id.util';

function positiveInt(value: unknown, name: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0)
		throw error(400, `${name} is required`);
	return parsed;
}

function requireVisitId(value: unknown): string {
	const visitId = parseUuid(value);
	if (!visitId) throw error(400, 'visitId is required');
	return visitId;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await procedure.listClinicalProcedures({
			hospitalId,
			visitId: requireVisitId(event.url.searchParams.get('visitId'))
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staff = requireClinicalStaff(event);
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	if (body.action === 'delete') {
		await procedure.deleteClinicalProcedure({
			id: positiveInt(body.id, 'id'),
			hospitalId
		});
		return json({ ok: true });
	}
	return json(
		await procedure.saveClinicalProcedure({
			id: body.id ? positiveInt(body.id, 'id') : undefined,
			hospitalId,
			visitId: requireVisitId(body.visitId),
			procedureType: String(body.procedureType ?? '').trim(),
			notes: String(body.notes ?? ''),
			performedAt: body.performedAt ? String(body.performedAt) : null,
			doctorId: staff.id
		})
	);
}
