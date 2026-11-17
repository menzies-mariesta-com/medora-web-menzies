import type { RequestEvent } from '@sveltejs/kit';
import {
	invalidateCacheTag,
	invalidateCacheKey
} from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags,
	hospitalApiGetTag,
	hospitalMetaTag
} from '$lib/server/cache/cache-keys.server';
// Lazy import in invalidateAfterApiMutation — page-nav pulls ensureDb/$env (breaks tsx seeds).

const MUTATION_METHODS = new Set([
	'POST',
	'PUT',
	'PATCH',
	'DELETE'
]);

function hospitalIdFromPath(pathname: string): string | null {
	const m = pathname.match(
		/^\/api\/medora\/hospital\/([^/]+)\//
	);
	return m?.[1] ?? null;
}

/** Global master catalog (lookup/status) may need refresh after admin master writes. */
export async function invalidateMasterLookupCaches(): Promise<void> {
	await invalidateCacheTag(cacheTags.masterLookup);
	await invalidateCacheTag(cacheTags.masterStatus);
	await invalidateCacheKey(cacheKeys.masterStatus());
}

const MASTER_MUTATION_PATH_RE =
	/\/(inventory-setup|administration)\//;

const NAV_MUTATION_PATH_RE = /\/admin\/.*\/page/i;

/**
 * Invalidate server + client cache tags after successful API mutations.
 * Central hook — covers all hospital master CRUD without per-handler boilerplate.
 */
export async function invalidateAfterApiMutation(
	event: RequestEvent,
	response: Response
): Promise<Headers> {
	const headers = new Headers(response.headers);
	if (!MUTATION_METHODS.has(event.request.method)) return headers;
	if (response.status >= 400) return headers;
	if (!event.url.pathname.startsWith('/api/')) return headers;

	const pathname = event.url.pathname;
	const hospitalId = hospitalIdFromPath(pathname);

	await invalidateCacheTag(cacheTags.apiGet);

	if (hospitalId) {
		await invalidateCacheTag(hospitalApiGetTag(hospitalId));
		await invalidateCacheTag(hospitalMetaTag(hospitalId));
		headers.set(
			'X-Medora-Invalidate-Client-Cache',
			`/api/medora/hospital/${hospitalId}`
		);
	} else {
		headers.set('X-Medora-Invalidate-Client-Cache', '/api/');
	}

	if (
		MASTER_MUTATION_PATH_RE.test(pathname) ||
		pathname.startsWith('/api/medora/admin/')
	) {
		await invalidateMasterLookupCaches();
	}

	if (
		NAV_MUTATION_PATH_RE.test(pathname) ||
		pathname.includes('/administration/user-group') ||
		pathname.includes('/page')
	) {
		const { invalidateMedoraPagesNavCache } = await import(
			'$lib/server/medora/page-nav-cache.server'
		);
		await invalidateMedoraPagesNavCache();
	}

	if (pathname.includes('/staff') && event.locals.user?.id) {
		const { invalidateStaffSessionCache } = await import(
			'$lib/server/medora/staff-session-cache.server'
		);
		await invalidateStaffSessionCache(event.locals.user.id);
	}

	return headers;
}