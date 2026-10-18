import type { PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import { getDocsManifest } from '$lib/docs/load-doc.server';

export const prerender = true;

export const load: PageServerLoad = async () => {
	const manifest = getDocsManifest();
	return {
		origin: getSiteOrigin(),
		stats: manifest.stats
	};
};
