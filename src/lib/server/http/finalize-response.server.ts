import type { RequestEvent } from '@sveltejs/kit';
import { applySecurityHeaders } from '$lib/server/http/security-headers.server';
import {
	serveCachedApiGetResponse,
	storeCachedApiGetResponse
} from '$lib/server/http/api-get-response-cache.server';
import { invalidateAfterApiMutation } from '$lib/server/http/api-mutation-cache-invalidate.server';
import { applyAuthenticatedHtmlCacheHeaders } from '$lib/server/http/html-edge-cache.server';

type FinalizeOptions = {
	/** Response was served from tiered cache before `resolve` (body already final). */
	fromEarlyCache?: boolean;
};

/** Attach caching, invalidation, security headers to every app response. */
export async function finalizeAppResponse(
	event: RequestEvent,
	response: Response,
	opts?: FinalizeOptions
): Promise<Response> {
	let out = response;

	if (event.request.method === 'GET') {
		if (!opts?.fromEarlyCache && event.url.pathname.startsWith('/api/')) {
			out = await storeCachedApiGetResponse(event, out);
		}
	} else {
		const headers = await invalidateAfterApiMutation(event, out);
		out = new Response(out.body, {
			status: out.status,
			statusText: out.statusText,
			headers
		});
	}

	out = applyAuthenticatedHtmlCacheHeaders(event, out);
	return applySecurityHeaders(out, event);
}

/** Fast path: cache hit before SvelteKit resolve. */
export async function tryEarlyCachedApiGet(
	event: RequestEvent
): Promise<Response | null> {
	if (event.request.method !== 'GET') return null;
	const hit = await serveCachedApiGetResponse(event);
	if (!hit) return null;
	return finalizeAppResponse(event, hit, { fromEarlyCache: true });
}