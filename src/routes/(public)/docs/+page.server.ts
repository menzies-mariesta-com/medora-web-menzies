import type { PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';

export const prerender = true;

export const load: PageServerLoad = async () => {
	return { origin: getSiteOrigin() };
};
