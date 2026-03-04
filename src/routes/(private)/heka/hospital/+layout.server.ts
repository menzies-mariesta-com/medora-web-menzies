import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, WebRoutesEnum.LOGIN);
	}
	// Staff cannot access hospital list (CRUD); redirect to their assigned hospital
	if (
		locals.userRoleId === RoleEnum.STAFF &&
		url.pathname === WebRoutesEnum.HEKA_HOSPITAL
	) {
		if (locals.allowedHospitalIds?.length) {
			throw redirect(
				302,
				hekaHospitalHome(locals.allowedHospitalIds[0])
			);
		}
		// No assigned hospital: redirect to /heka/hospital so the page can show "No hospital assigned"
	}
	return {};
};
