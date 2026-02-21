import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const hospitalId = Number(params.hospital_id);
	// Staff may only access their assigned hospitals
	if (locals.userRoleId === RoleEnum.STAFF && locals.allowedHospitalIds?.length) {
		const allowed = new Set(locals.allowedHospitalIds);
		if (!Number.isNaN(hospitalId) && !allowed.has(hospitalId)) {
			throw redirect(302, hekaHospitalHome(locals.allowedHospitalIds[0]));
		}
	}
	return {};
};
