import type { LayoutServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import { getDocsManifest } from '$lib/docs/load-doc.server';

export const prerender = true;

export const load: LayoutServerLoad = async () => {
	const manifest = getDocsManifest();
	return {
		origin: getSiteOrigin(),
		modules: manifest.modules,
		searchIndex: manifest.searchIndex,
		stats: manifest.stats
	};
};
