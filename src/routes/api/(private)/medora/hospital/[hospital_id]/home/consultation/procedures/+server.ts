import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { requireClinicalStaff } from '$lib/server/medora/clinical/clinical-authority.server';
import * as procedure from '$lib/server/medora/clinical/procedure.server';

function id(value: unknown, name: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0)
		throw error(400, `${name} is required`);
	return parsed;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await procedure.listClinicalProcedures({
			hospitalId,
			visitId: id(event.url.searchParams.get('visitId'), 'visitId')
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
			id: id(body.id, 'id'),
			hospitalId
		});
		return json({ ok: true });
	}
	return json(
		await procedure.saveClinicalProcedure({
			id: body.id ? id(body.id, 'id') : undefined,
			hospitalId,
			visitId: id(body.visitId, 'visitId'),
			procedureType: String(body.procedureType ?? '').trim(),
			notes: String(body.notes ?? ''),
			performedAt: body.performedAt ? String(body.performedAt) : null,
			doctorId: staff.id
		})
	);
}
