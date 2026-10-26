import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { registerOtPatient } from '$lib/server/medora/operation-theatre/ot-registration.server';

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Body required');
	const branchId = String(body.branchId ?? '').trim();
	if (!branchId) throw error(400, 'Facility is required');
	return json(
		await registerOtPatient(event, {
			hospitalId,
			branchId,
			firstName: String(body.firstName ?? ''),
			middleName: body.middleName ? String(body.middleName) : null,
			lastName: String(body.lastName ?? ''),
			phonePrimary: body.phonePrimary
				? String(body.phonePrimary)
				: null,
			email: body.email ? String(body.email) : null,
			dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth) : null,
			genderId: body.genderId ? Number(body.genderId) : null,
			address: body.address ? String(body.address) : null,
			procedureName: body.procedureName
				? String(body.procedureName)
				: null,
			otRequestDate: body.otRequestDate
				? String(body.otRequestDate)
				: null,
			priority: body.priority ? String(body.priority) : 'elective'
		})
	);
}
