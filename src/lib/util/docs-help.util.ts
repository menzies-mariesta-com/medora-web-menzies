import manifest from '$lib/docs/manifest.json';

/**
 * Public documentation lives on the landing site, not in this app.
 * Keep in step with `netlify.toml` on `landing-web-menzies`.
 */
export const DOCS_SITE_ORIGIN = 'https://store.menzies.design';

/** Map hospital app page_url (with /medora/home) to its public docs page. */
export function medoraPageUrlToDocsHref(pageUrl: string | null | undefined): string | null {
	if (!pageUrl?.trim()) return null;
	const trimmed = pageUrl.trim();
	const row = manifest.workflows.find((w) => w.pageUrl === trimmed);
	const slug = trimmed.replace(/^\/medora\/home\//, '').replace(/\//g, '-');
	const match = row ?? manifest.workflows.find((w) => w.slug === slug);
	if (!match) return null;
	// Mirrors `scripts/move-medora-docs.mjs` on the landing site: module folder first.
	return `${DOCS_SITE_ORIGIN}/docs/medora/${match.moduleSlug}/${match.slug}`;
}

/** Root of the public docs, for a generic "open the manual" link. */
export function docsHomeHref(): string {
	return `${DOCS_SITE_ORIGIN}/docs/getting-started`;
}
