import type { RequestEvent } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import {
	cacheGet,
	cacheSet
} from '$lib/server/cache/tiered-cache.server';
import { cacheKeys } from '$lib/server/cache/cache-keys.server';
import { getApiCachePolicy } from '$lib/server/http/api-cache-policy.server';
import { privateJsonCacheHeaders } from '$lib/server/http/api-cache-headers.server';

export type StoredApiResponse = {
	status: number;
	body: string;
	headers: Record<string, string>;
};

function sortedQuery(search: string): string {
	const params = new URLSearchParams(search);
	const keys = [...params.keys()].sort();
	const normalized = new URLSearchParams();
	for (const key of keys) {
		const values = params.getAll(key).sort();
		for (const v of values) normalized.append(key, v);
	}
	return normalized.toString();
}

function apiCacheDigest(event: RequestEvent): string {
	const userId = event.locals.user?.id ?? 'anon';
	const roleId = String(event.locals.userRoleId ?? '');
	const path = event.url.pathname;
	const query = sortedQuery(event.url.search);
	const raw = `${userId}:${roleId}:${path}?${query}`;
	return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function responseFromStored(stored: StoredApiResponse): Response {
	return new Response(stored.body, {
		status: stored.status,
		headers: stored.headers
	});
}

/** Serve a cached GET /api JSON response when policy allows. */
export async function serveCachedApiGetResponse(
	event: RequestEvent
): Promise<Response | null> {
	if (event.request.method !== 'GET') return null;
	if (!event.url.pathname.startsWith('/api/')) return null;

	const policy = getApiCachePolicy(
		event.url.pathname,
		event.url.searchParams
	);
	if (policy.mode !== 'tiered') return null;

	const digest = apiCacheDigest(event);
	const key = cacheKeys.apiGetResponse(digest);
	const hit = await cacheGet<StoredApiResponse>(key);
	if (!hit) return null;

	return responseFromStored(hit);
}

/** Store successful JSON GET responses for tiered policy. */
export async function storeCachedApiGetResponse(
	event: RequestEvent,
	response: Response
): Promise<Response> {
	if (event.request.method !== 'GET') return response;
	if (!event.url.pathname.startsWith('/api/')) return response;

	const policy = getApiCachePolicy(
		event.url.pathname,
		event.url.searchParams
	);
	if (policy.mode !== 'tiered') return response;
	if (response.status !== 200) return response;

	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) return response;

	const clone = response.clone();
	const body = await clone.text();

	const headers = privateJsonCacheHeaders(
		policy.maxAgeSeconds,
		policy.staleWhileRevalidateSeconds
	);
	headers['content-type'] =
		contentType || 'application/json; charset=utf-8';
	headers['x-medora-api-cache'] = 'miss';

	const digest = apiCacheDigest(event);
	await cacheSet(
		cacheKeys.apiGetResponse(digest),
		{
			status: 200,
			body,
			headers: { ...headers, 'x-medora-api-cache': 'hit' }
		} satisfies StoredApiResponse,
		policy.ttlSeconds,
		policy.tags
	);

	return new Response(body, { status: 200, headers });
}