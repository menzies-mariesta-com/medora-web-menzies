import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';

const COOKIE_SESSION_EXTENDED_FOR = 'heka_session_extended_for';

/** Only SYSTEM_ADMIN can access /heka/admin/* */
export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(
			302,
			`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`
		);
	}
	if (locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw redirect(302, WebRoutesEnum.HEKA_HOSPITAL);
	}
	const sessionId = locals.session?.id ?? null;
	const extendedFor = cookies.get(COOKIE_SESSION_EXTENDED_FOR) ?? null;
	return {
		user: locals.user,
		staff: locals.staff ?? null,
		sessionId,
		sessionExpiresAt: locals.session?.expiresAt ?? null,
		sessionExtendedOnce: !!sessionId && extendedFor === sessionId
	};
};
