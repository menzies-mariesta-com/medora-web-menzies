import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) throw redirect(302, '/');
	const target = medoraHospitalPageUrl(
		hospitalId,
		WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_NEW
	);
	const qs = new URLSearchParams({ careSetting: 'ED' });
	for (const key of ['patientId', 'sourceOpdVisitId', 'orderId']) {
		const value = url.searchParams.get(key);
		if (value) qs.set(key, value);
	}
	throw redirect(302, `${target}?${qs}`);
};
