import type { PageServerLoad } from './$types';
import { redirectToNursingChart } from '$lib/tool/nursing/nursing-legacy-redirect.server';

export const load: PageServerLoad = ({ params, url }) => {
	redirectToNursingChart({
		hospitalId: params.hospital_id,
		targetPageUrl: `/medora/home/nursing-workbench/${params.rest}`,
		searchParams: url.searchParams
	});
};
