import type { EntryGenerator, PageServerLoad } from './$types';
import { getSiteOrigin } from '$lib/server/seo/site-origin.server';
import { getDocsManifest, loadDocBySlugParts } from '$lib/docs/load-doc.server';
import {
	getAdjacentDocs,
	getDocsSectionLabel
} from '$lib/tool/docs/nav-adjacent.util';

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
	const { prev, next } = getAdjacentDocs(slugParts);
	return {
		origin: getSiteOrigin(),
		slugParts,
		doc,
		manifest,
		sectionLabel: getDocsSectionLabel(slugParts),
		prev,
		next
	};
};
