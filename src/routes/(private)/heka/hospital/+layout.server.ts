import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { hekaHospitalHome } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

const COOKIE_SESSION_EXTENDED_FOR = 'heka_session_extended_for';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(
			302,
			`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`
		);
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
	const sessionId = locals.session?.id ?? null;
	const extendedFor = cookies.get(COOKIE_SESSION_EXTENDED_FOR) ?? null;
	return {
		sessionId,
		sessionExpiresAt: locals.session?.expiresAt ?? null,
		sessionExtendedOnce: !!sessionId && extendedFor === sessionId
	};
};
