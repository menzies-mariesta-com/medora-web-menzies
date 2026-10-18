import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

/** Preserve visitId when redirecting legacy Emergency URLs to Nursing ED. */
export function redirectEmergencyToNursingEd(
	hospitalId: string,
	targetPageUrl: string,
	searchParams: URLSearchParams
): never {
	const base = medoraHospitalPageUrl(hospitalId, targetPageUrl);
	const vid = searchParams.get('visitId');
	const url = vid ? `${base}?visitId=${encodeURIComponent(vid)}` : base;
	throw redirect(302, url);
}

export const nursingEdTrackBoardUrl = WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_ED_TRACK_BOARD;
export const nursingEdTriageUrl = WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_ED_TRIAGE;
export const nursingEdTraumaLogUrl = WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_ED_TRAUMA_LOG;
