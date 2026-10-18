/** Logical URL prefix for workflow capture screenshots in markdown. */
export const DOCS_CAPTURE_URL_PREFIX = '/docs/capture/workflows';

/** Project-relative disk directory for capture PNGs (Node scripts). */
export const DOCS_CAPTURE_ASSET_DIR_REL = 'src/lib/docs/asset/capture/workflows';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE_RE = /^step-\d{2}-[a-z0-9-]+\.png$/i;

export function captureWorkflowImageUrl(slug: string, fileName: string): string {
	return `${DOCS_CAPTURE_URL_PREFIX}/${slug}/${fileName}`;
}

/**
 * Parse a markdown image href into slug + file if it is a workflow capture path.
 * Rejects path traversal and invalid segments.
 */
export function parseCaptureImageLogicalPath(href: string): { slug: string; fileName: string } | null {
	const trimmed = href.trim();
	const prefix = `${DOCS_CAPTURE_URL_PREFIX}/`;
	if (!trimmed.startsWith(prefix)) return null;
	const rest = trimmed.slice(prefix.length);
	if (rest.includes('..') || rest.includes('\\')) return null;
	const slash = rest.lastIndexOf('/');
	if (slash <= 0) return null;
	const slug = rest.slice(0, slash);
	const fileName = rest.slice(slash + 1);
	if (!SLUG_RE.test(slug) || !FILE_RE.test(fileName)) return null;
	return { slug, fileName };
}

export function isCaptureImageLogicalPath(href: string): boolean {
	return parseCaptureImageLogicalPath(href) !== null;
}
