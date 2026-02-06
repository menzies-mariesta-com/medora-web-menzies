import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, WebRoutesEnum.LOGIN);
	}
	// If session exists and we're on exactly /heka, redirect to HEKA_HOME (handled by +page.svelte onMount too; optional server redirect)
	if (url.pathname === WebRoutesEnum.HEKA || url.pathname === `${WebRoutesEnum.HEKA}/`) {
		throw redirect(302, WebRoutesEnum.HEKA_HOME);
	}
	return {
		user: locals.user
	};
};
