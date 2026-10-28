import type { PageServerLoad } from './$types';
import { redirectToNursingChart } from '$lib/tool/nursing/nursing-legacy-redirect.server';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

/** Nursing module entry opens the visit history dashboard (shared nursing chart). */
export const load: PageServerLoad = ({ params, url }) => {
	redirectToNursingChart({
		hospitalId: params.hospital_id,
		targetPageUrl:
			WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_PATIENT_VISIT_HISTORY_DASHBOARD,
		searchParams: url.searchParams
	});
};
