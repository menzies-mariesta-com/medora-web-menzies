import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

export const load: PageServerLoad = async ({ params }) => {
	throw redirect(
		302,
		medoraHospitalPageUrl(
			params.hospital_id,
			WebRoutesEnum.MEDORA_HOME_CONSULTATION_EMR
		)
	);
};
