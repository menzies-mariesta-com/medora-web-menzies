import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	hekaHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

export const load: PageServerLoad = async ({ params }) => {
	throw redirect(
		302,
		hekaHospitalPageUrl(
			params.hospital_id,
			WebRoutesEnum.HEKA_HOME_CONSULTATION_EMR
		)
	);
};
