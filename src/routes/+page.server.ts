import type { PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';

/** Static marketing shell; session CTA resolves to anonymous defaults at build. */
export const prerender = true;

export const load: PageServerLoad = async () => {
	return { origin: getSiteOrigin() };
};
