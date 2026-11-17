/**
 * Warm a destination page's data on hover, so the click is a cache hit.
 *
 * `data-sveltekit-preload-data="hover"` already preloads the route's `load`
 * functions, but every product page in this app fetches its own JSON from
 * `/api/**` after mount, so that preload warms no data. This closes that gap.
 *
 * Target resolution, first hit wins:
 * 1. `data-prefetch-api` on the anchor or an ancestor (space-separated URLs).
 * 2. The URL this page actually fetched last time it was opened (`rememberPageFetch`).
 * 3. Convention `/<page path>` → `/api/<page path>` at default pagination.
 *
 * Convention/learned targets must map to a cacheable tier, so hovering a `new`,
 * `[id]` or live-data screen fires nothing instead of a wasted request.
 */

import { cachedFetch } from '$lib/util/client-fetch-cache.util';
import { pathnameToApiTemplate } from '$lib/util/api-route-template.util';
import { API_ROUTE_TIER_BY_TEMPLATE } from '$lib/util/api-route-tier.generated';
import { AppEnum } from '$lib/model/enum/app.enum';

const PREFETCH_ATTR = 'data-prefetch-api';

/** One warm per URL per session: hovering back and forth must not re-fetch. */
const warmed = new Set<string>();

/**
 * The URL each page opened with, keyed by page pathname. Learning the query shape
 * from the real mount beats guessing pagination that may not match.
 */
const learnedOpeningRead = new Map<string, string>();

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

function tierForApiUrl(url: string): string | undefined {
	const pathname = url.split('?')[0];
	return API_ROUTE_TIER_BY_TEMPLATE[pathnameToApiTemplate(pathname)];
}

/** Convention API path for a page, ignoring its query. */
function conventionApiPath(pagePath: string): string | null {
	if (!pagePath.startsWith('/medora/')) return null;
	const apiPath = pagePath.replace(/^\/medora\//, '/api/medora/');
	const tier = tierForApiUrl(apiPath);
	if (!tier || tier === 'no-store') return null;
	return apiPath;
}

/**
 * Record a page's opening read. Called by the global fetch patch for every GET `/api`.
 * Only a fetch whose path *is* the page's convention API path counts, so a nav or
 * background read can never teach the wrong URL.
 */
export function rememberPageFetch(
	pagePath: string,
	url: string
): void {
	if (learnedOpeningRead.has(pagePath)) return;
	if (!url.startsWith('/api/')) return;
	if (url.split('?')[0] !== conventionApiPath(pagePath)) return;
	learnedOpeningRead.set(pagePath, url);
}

/** URLs worth warming for a destination page. */
export function prefetchUrlsFor(pathname: string): string[] {
	const learned = learnedOpeningRead.get(pathname);
	if (learned) return [learned];
	const apiPath = conventionApiPath(pathname);
	if (!apiPath) return [];
	const query = new URLSearchParams({
		page: '1',
		pageSize: String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	});
	return [`${apiPath}?${query.toString()}`];
}

function warm(url: string): void {
	if (warmed.has(url)) return;
	warmed.add(url);
	// `cachedFetch` shares an in-flight request with the page's own mount read.
	void cachedFetch(url, { credentials: 'include' }).catch(() => {
		// Hover is best-effort; the page's own fetch handles errors and toasts.
	});
}

function urlsForAnchor(anchor: HTMLAnchorElement): string[] {
	// Opt-in may sit on the anchor or on a wrapping row/menu item.
	const explicit = anchor
		.closest(`[${PREFETCH_ATTR}]`)
		?.getAttribute(PREFETCH_ATTR);
	if (explicit) {
		return explicit.split(/\s+/).filter((u) => u.startsWith('/api/'));
	}
	if (anchor.origin !== window.location.origin) return [];
	// Already here: the page's own mount read has run.
	if (anchor.pathname === window.location.pathname) return [];
	return prefetchUrlsFor(anchor.pathname);
}

/** Forget learned read URLs (new session: another user's pages may differ). */
export function resetHoverPrefetch(): void {
	learnedOpeningRead.clear();
	warmed.clear();
}

/** Install once from `hooks.client.ts`. */
export function installHoverPrefetch(): void {
	if (!isBrowser()) return;
	if (typeof document === 'undefined') return;

	const schedule =
		typeof window.requestIdleCallback === 'function'
			? (fn: () => void) =>
					window.requestIdleCallback(fn, { timeout: 400 })
			: (fn: () => void) => window.setTimeout(fn, 60);

	document.addEventListener(
		'pointerenter',
		(event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const anchor = target.closest('a[href]');
			if (!(anchor instanceof HTMLAnchorElement)) return;
			if (anchor.hasAttribute('download')) return;

			const urls = urlsForAnchor(anchor);
			if (urls.length === 0) return;
			schedule(() => {
				for (const url of urls) warm(url);
			});
		},
		{ capture: true, passive: true }
	);
}
