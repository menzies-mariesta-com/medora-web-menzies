import type { PageServerLoad } from './$types';
import { redirectToUnifiedBillingAdvanceDeposit } from '$lib/tool/billing/billing-legacy-redirect.server';

export const load: PageServerLoad = ({ params, url }) => {
	redirectToUnifiedBillingAdvanceDeposit({
		hospitalId: params.hospital_id,
		searchParams: url.searchParams
	});
};
