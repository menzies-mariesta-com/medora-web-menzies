import manifest from '$lib/docs/manifest.json';

/** Map hospital app page_url (with /medora/home) to public docs workflow path. */
export function medoraPageUrlToDocsHref(pageUrl: string | null | undefined): string | null {
	if (!pageUrl?.trim()) return null;
	const trimmed = pageUrl.trim();
	const row = manifest.workflows.find((w) => w.pageUrl === trimmed);
	if (row) return row.path;
	const slug = trimmed.replace(/^\/medora\/home\//, '').replace(/\//g, '-');
	const bySlug = manifest.workflows.find((w) => w.slug === slug);
	return bySlug?.path ?? null;
}
