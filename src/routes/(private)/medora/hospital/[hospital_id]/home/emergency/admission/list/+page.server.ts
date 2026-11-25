import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import type { PageServerLoad } from './$types';

/** Retired registration list → the ADT admission list. */
export const load: PageServerLoad = ({ params }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) throw redirect(302, '/');
	throw redirect(
		302,
		medoraHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_LIST
		)
	);
};
