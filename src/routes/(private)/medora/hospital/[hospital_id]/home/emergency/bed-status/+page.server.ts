import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import type { PageServerLoad } from './$types';

/** One bed-status board now lives in ADT; filter it to ED. */
export const load: PageServerLoad = ({ params, url }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) throw redirect(302, '/');
	const target = medoraHospitalPageUrl(
		hospitalId,
		WebRoutesEnum.MEDORA_HOME_ADT_BED_STATUS
	);
	const qs = new URLSearchParams({ careSetting: 'ED' });
	const wardId = url.searchParams.get('wardId');
	if (wardId) qs.set('wardId', wardId);
	throw redirect(302, `${target}?${qs}`);
};
