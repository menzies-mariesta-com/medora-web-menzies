import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

export const load: PageServerLoad = async ({ params }) => {
	const hospitalId = params.hospital_id;
	throw redirect(
		302,
		medoraHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_EMR_PATIENT_VISIT_HISTORY_DASHBOARD
		)
	);
};
