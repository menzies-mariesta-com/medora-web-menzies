import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import type { PageServerLoad } from './$types';

/** Bookmarks to the removed registration list → ED Patient Registration. */
export const load: PageServerLoad = ({ params }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) throw redirect(302, '/');
	throw redirect(
		302,
		medoraHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.MEDORA_HOME_EMERGENCY_ADMISSION_NEW
		)
	);
};
