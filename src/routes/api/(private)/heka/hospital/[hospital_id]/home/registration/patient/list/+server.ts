import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deletePatient,
	getPatientByIdWithRelations,
	getPatientListPaginated
} from '$lib/server/heka/registration/patient.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;

	const id = event.url.searchParams.get('id');
	if (id) {
		const data = await getPatientByIdWithRelations(event, {
			hospitalId,
			id
		});
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const search = event.url.searchParams.get('search') ?? undefined;
	const patientCode =
		event.url.searchParams.get('patientCode') ?? undefined;
	const patientName =
		event.url.searchParams.get('patientName') ?? undefined;
	const patientPhonePrimary =
		event.url.searchParams.get('patientPhonePrimary') ?? undefined;

	const data = await getPatientListPaginated(event, {
		hospitalId,
		page,
		pageSize,
		search,
		patientCode,
		patientName,
		patientPhonePrimary
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	await deletePatient(event, {
		hospitalId,
		id: String(body.id ?? '')
	});
	return json({ ok: true });
};
