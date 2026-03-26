import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { base } from '$app/paths';

export const load: PageServerLoad = async () => {
	throw redirect(302, `${base}/auth/login`);
};

