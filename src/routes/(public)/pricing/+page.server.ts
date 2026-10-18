import type { PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';

/** Prerender HTML; trial POST uses /api/pricing/trial-request. */
export const prerender = true;

export const load: PageServerLoad = async () => {
	return { origin: getSiteOrigin() };
};
