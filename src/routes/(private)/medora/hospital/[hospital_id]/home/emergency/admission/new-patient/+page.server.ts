import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import type { PageServerLoad } from './$types';

/** ED patient registration is the unified registration page with a return URL. */
export const load: PageServerLoad = ({ params, url }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) throw redirect(302, '/');
	const backTo = `${medoraHospitalPageUrl(
		hospitalId,
		WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_NEW
	)}?careSetting=ED`;
	const qs = new URLSearchParams({ returnTo: backTo });
	const patientId = url.searchParams.get('patientId');
	if (patientId) qs.set('patientId', patientId);
	throw redirect(
		302,
		`${medoraHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.MEDORA_HOME_REGISTRATION_PATIENT_REGISTRATION
		)}?${qs}`
	);
};
