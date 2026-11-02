import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

/**
 * Redirect legacy `/nursing-workbench/emr`, `/ipd` and `/ed` URLs to the
 * consolidated nursing chart pages, preserving the selected visit.
 */
export function redirectToNursingChart(input: {
	hospitalId: string;
	targetPageUrl: string;
	searchParams: URLSearchParams;
}): never {
	const base = medoraHospitalPageUrl(
		input.hospitalId,
		input.targetPageUrl
	);
	const search = input.searchParams.toString();
	throw redirect(302, search ? `${base}?${search}` : base);
}

export const nursingLegacyRootTargets = {
	emr: WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_PATIENT_VISIT_HISTORY_DASHBOARD,
	ipd: WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_CENSUS,
	ed: WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_TRACK_BOARD
} as const;
