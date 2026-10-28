import type { PageServerLoad } from './$types';
import { redirectToUnifiedBillingBill } from '$lib/tool/billing/billing-legacy-redirect.server';

export const load: PageServerLoad = ({ params, url }) => {
	redirectToUnifiedBillingBill({
		hospitalId: params.hospital_id,
		searchParams: url.searchParams
	});
};
