import type { EntryGenerator, PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import { getDocsManifest, loadDocBySlugParts } from '$lib/docs/load-doc.server';

export const prerender = true;

export const entries: EntryGenerator = () => {
	const manifest = getDocsManifest();
	return manifest.prerenderPaths
		.filter((p) => p !== '/docs')
		.map((p) => ({ slug: p.replace(/^\/docs\/?/, '') }));
};

export const load: PageServerLoad = async ({ params }) => {
	const slugParts = params.slug?.split('/').filter(Boolean) ?? [];
	const doc = loadDocBySlugParts(slugParts);
	const manifest = getDocsManifest();
	return {
		origin: getSiteOrigin(),
		slugParts,
		doc,
		manifest
	};
};
