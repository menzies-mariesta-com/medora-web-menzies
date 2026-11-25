import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import type { PageServerLoad } from './$types';

/** ED registration now lives on the unified ADT admission form. */
export const load: PageServerLoad = ({ params, url }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) throw redirect(302, '/');
	const target = medoraHospitalPageUrl(
		hospitalId,
		WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_NEW
	);
	const qs = new URLSearchParams({ careSetting: 'ED' });
	const patientId = url.searchParams.get('patientId');
	if (patientId) qs.set('patientId', patientId);
	throw redirect(302, `${target}?${qs}`);
};
