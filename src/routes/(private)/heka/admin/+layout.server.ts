import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

/** Only SYSTEM_ADMIN can access /heka/admin/* */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, WebRoutesEnum.LOGIN);
	}
	if (locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw redirect(302, WebRoutesEnum.HEKA_HOSPITAL);
	}
	return {
		user: locals.user,
		staff: locals.staff ?? null
	};
};
