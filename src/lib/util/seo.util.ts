/**
 * Shared SEO helpers for public Medora pages.
 * Prefer {@link SeoHead} in components; use these for URLs and JSON-LD.
 */

/** Default Open Graph / Twitter image (exists under `static/`). */
export const DEFAULT_OG_IMAGE_PATH = '/og-medora.png';

/**
 * Canonical public paths included in the XML sitemap.
 * Auth, onboarding, private app, and APIs stay out.
 */
export const PUBLIC_SITEMAP_PATHS = ['/', '/pricing', '/docs'] as const;

export type PublicSitemapPath = (typeof PUBLIC_SITEMAP_PATHS)[number];

/** Strip trailing slash except for site root. */
export function normalizeOrigin(origin: string): string {
	return origin.replace(/\/$/, '');
}

/**
 * Absolute URL for canonical / OG.
 * Root (`/` or ``) becomes `https://host/`; other paths have no trailing slash.
 */
export function absoluteUrl(origin: string, path = '/'): string {
	const base = normalizeOrigin(origin);
	if (!path || path === '/') return `${base}/`;
	const normalized = path.startsWith('/') ? path : `/${path}`;
	return `${base}${normalized.replace(/\/$/, '')}`;
}

export function absoluteAssetUrl(
	origin: string,
	assetPath: string = DEFAULT_OG_IMAGE_PATH
): string {
	const base = normalizeOrigin(origin);
	const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
	return `${base}${path}`;
}

/** Safe JSON for `<script type="application/ld+json">` (escape nested `</script>`). */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}
