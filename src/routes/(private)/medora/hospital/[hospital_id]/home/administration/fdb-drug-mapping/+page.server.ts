import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';

export const load: PageServerLoad = async ({ params }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) return {};
	throw redirect(
		302,
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/administration/rxnorm-drug-mapping'
		)
	);
};
