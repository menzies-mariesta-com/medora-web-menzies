import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

/** Public signup is disabled; SYSTEM_ADMIN creates owners. */
export const load: PageServerLoad = async () => {
	throw redirect(302, WebRoutesEnum.LOGIN);
};
