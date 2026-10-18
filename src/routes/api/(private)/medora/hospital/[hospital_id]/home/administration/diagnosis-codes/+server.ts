import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getHospitalDiagnosisCatalogMeta,
	listHospitalDiagnosisCodes
} from '$lib/server/medora/clinical/diagnosis-code-catalog.server';

/**
 * Read-only WHO ICD catalog for the hospital's bound coding system.
 * GET ?mode=meta | list&search=&page=&pageSize=
 */
export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'meta') {
		return json(await getHospitalDiagnosisCatalogMeta(hospitalId));
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '25'
	);
	const search = event.url.searchParams.get('search') ?? '';
	return json(
		await listHospitalDiagnosisCodes({
			hospitalId,
			search,
			page,
			pageSize
		})
	);
};
