import {
	captureWorkflowImageUrl,
	parseCaptureImageLogicalPath
} from '$lib/docs/capture-paths';

const modules = import.meta.glob('$lib/docs/asset/capture/workflows/**/*.png', {
	eager: true,
	query: '?url',
	import: 'default'
}) as Record<string, string>;

function buildCaptureUrlMap(): Map<string, string> {
	const map = new Map<string, string>();
	for (const [key, url] of Object.entries(modules)) {
		const m = key.match(/capture\/workflows\/([^/]+)\/([^/]+\.png)$/i);
		if (m) {
			map.set(captureWorkflowImageUrl(m[1], m[2]), url);
		}
	}
	return map;
}

const captureUrlByLogical = buildCaptureUrlMap();

/** Resolve markdown logical capture path to a Vite-built asset URL. */
export function resolveCaptureImageUrl(href: string): string | undefined {
	const trimmed = href.trim();
	const parsed = parseCaptureImageLogicalPath(trimmed);
	if (!parsed) return undefined;
	const logical = captureWorkflowImageUrl(parsed.slug, parsed.fileName);
	return captureUrlByLogical.get(logical);
}

/** For docs markdown: map capture paths to bundled URLs; pass other hrefs through. */
export function resolveDocCaptureImageHref(href: string): string | undefined {
	const trimmed = href.trim();
	if (!parseCaptureImageLogicalPath(trimmed)) return undefined;
	return resolveCaptureImageUrl(trimmed);
}
