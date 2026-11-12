import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

/** Redirect legacy OP / ER / IP bill URLs to the unified billing bill page. */
export function redirectToUnifiedBillingBill(input: {
	hospitalId: string;
	searchParams: URLSearchParams;
}): never {
	const base = medoraHospitalPageUrl(
		input.hospitalId,
		WebRoutesEnum.MEDORA_HOME_BILLING_BILL
	);
	const search = input.searchParams.toString();
	throw redirect(302, search ? `${base}?${search}` : base);
}

/** Redirect legacy IP advance-deposit URL to unified billing advance deposit. */
export function redirectToUnifiedBillingAdvanceDeposit(input: {
	hospitalId: string;
	searchParams: URLSearchParams;
}): never {
	const base = medoraHospitalPageUrl(
		input.hospitalId,
		WebRoutesEnum.MEDORA_HOME_BILLING_ADVANCE_DEPOSIT
	);
	const search = input.searchParams.toString();
	throw redirect(302, search ? `${base}?${search}` : base);
}
