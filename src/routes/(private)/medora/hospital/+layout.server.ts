import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { medoraHospitalHome } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

export const load: LayoutServerLoad = async ({
	locals,
	url,
	depends
}) => {
	depends('app:session-expiry');
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
		url.pathname === WebRoutesEnum.MEDORA_HOSPITAL
	) {
		if (locals.allowedHospitalIds?.length) {
			throw redirect(
				302,
				medoraHospitalHome(locals.allowedHospitalIds[0])
			);
		}
		// No assigned hospital: redirect to /medora/hospital so the page can show "No hospital assigned"
	}
	const sessionId = locals.session?.id ?? null;
	return {
		sessionId,
		sessionExpiresAt: locals.session?.expiresAt ?? null
	};
};
