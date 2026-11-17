import { error, type RequestEvent } from '@sveltejs/kit';
import {
	ROUTE_PERMISSION,
	routeAction,
	routePageUrls
} from '$lib/server/medora/permission/page-permission-route-map.server';
import { requirePageAction } from '$lib/server/medora/permission/page-permission.server';

const API_HOME_PATTERN =
	/^\/api\/medora\/hospital\/([^/]+)\/home(?:\/(.*?))?\/?$/;

/** `/api/medora/hospital/:id/home/<rest>` → route key used by the permission map. */
export function apiHomeRouteKey(pathname: string): string | null {
	const match = pathname.match(API_HOME_PATTERN);
	if (!match) return null;
	const rest = match[2] ?? '';
	return rest === '' ? '/' : `/${rest}`;
}

/**
 * Map lookup that accepts dynamic segments: a `[entity]` route segment matches
 * any single path segment, so `/administration/medication-order-setup/dose-unit`
 * resolves to the `[entity]` entry instead of falling through to a 403.
 */
export function lookupRoutePermission(
	key: string
): (typeof ROUTE_PERMISSION)[string] | undefined {
	const direct = ROUTE_PERMISSION[key];
	if (direct) return direct;

	const segments = key.split('/');
	let wildcard: (typeof ROUTE_PERMISSION)[string] | undefined;
	for (const [template, entry] of Object.entries(ROUTE_PERMISSION)) {
		const parts = template.split('/');
		if (parts.length !== segments.length) continue;
		// Only `[param]` templates may be substituted; anything else is literal.
		if (template.indexOf('[') === -1) continue;
		const matches = parts.every(
			(part, i) => part === segments[i] || /^\[[^\]]+\]$/.test(part)
		);
		if (matches) wildcard = entry;
	}
	return wildcard;
}

/**
 * Fail-closed authorization for `/api/medora/hospital/:id/home/**`.
 * Returns a 403 response when denied, or `null` to continue.
 * Runs **before** the early cached GET so a cached body can never leak past it.
 */
export async function pagePermissionDeniedResponse(
	event: RequestEvent
): Promise<Response | null> {
	const key = apiHomeRouteKey(event.url.pathname);
	if (key === null) return null;

	const permission = lookupRoutePermission(key);
	try {
		if (!permission) {
			throw error(403, 'This endpoint has no permission mapping');
		}
		const hospitalId = String(event.params.hospital_id ?? '');
		if (!hospitalId) throw error(400, 'Hospital is required');
		await requirePageAction(event, {
			hospitalId,
			pageUrls: routePageUrls(permission),
			action: routeAction(permission, event.request.method)
		});
		return null;
	} catch (err) {
		const status = (err as { status?: unknown }).status;
		if (typeof status !== 'number' || status < 400 || status > 599) {
			throw err;
		}
		const message =
			(err as { body?: { message?: string } }).body?.message ??
			'Forbidden';
		return new Response(JSON.stringify({ message }), {
			status,
			headers: { 'content-type': 'application/json' }
		});
	}
}
