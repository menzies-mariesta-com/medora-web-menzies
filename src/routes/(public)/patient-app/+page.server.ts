import type { PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';

export const load: PageServerLoad = async () => ({
	origin: getSiteOrigin()
});