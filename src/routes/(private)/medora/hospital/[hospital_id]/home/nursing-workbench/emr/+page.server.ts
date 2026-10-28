import type { PageServerLoad } from './$types';
import {
	nursingLegacyRootTargets,
	redirectToNursingChart
} from '$lib/tool/nursing/nursing-legacy-redirect.server';

export const load: PageServerLoad = ({ params, url }) => {
	redirectToNursingChart({
		hospitalId: params.hospital_id,
		targetPageUrl: nursingLegacyRootTargets.emr,
		searchParams: url.searchParams
	});
};
