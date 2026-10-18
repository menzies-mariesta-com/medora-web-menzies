import type { PageServerLoad } from './$types';
import {
	nursingEdTraumaLogUrl,
	redirectEmergencyToNursingEd
} from '$lib/tool/medora/emergency-route-redirect.server';

export const load: PageServerLoad = ({ params, url }) => {
	const hid = params.hospital_id;
	if (!hid) return {};
	redirectEmergencyToNursingEd(hid, nursingEdTraumaLogUrl, url.searchParams);
};
