import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { hekaHospitalPageUrl, WebRoutesEnum } from '$lib/model/enum/routes.enum';

export const load: PageServerLoad = async ({ params }) => {
	const hospitalId = params.hospital_id;
	throw redirect(
		302,
		hekaHospitalPageUrl(hospitalId, WebRoutesEnum.HEKA_HOME_NURSING_WORKBENCH_EMR)
	);
};
