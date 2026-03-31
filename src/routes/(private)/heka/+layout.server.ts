import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	WebRoutesEnum,
	hekaHospitalHome
} from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(
			302,
			`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`
		);
	}
	// If session exists and we're on exactly /heka, redirect appropriately by role
	if (
		url.pathname === WebRoutesEnum.HEKA ||
		url.pathname === `${WebRoutesEnum.HEKA}/`
	) {
		// Staff: go directly to their (first) assigned hospital home
		if (
			locals.userRoleId === RoleEnum.STAFF &&
			locals.allowedHospitalIds?.length
		) {
			throw redirect(
				302,
				hekaHospitalHome(locals.allowedHospitalIds[0])
			);
		}
		throw redirect(302, WebRoutesEnum.HEKA_HOSPITAL);
	}
	return {
		user: locals.user,
		staff: locals.staff ?? null,
		userRoleId: locals.userRoleId ?? null,
		allowedHospitalIds: locals.allowedHospitalIds ?? null
	};
};
