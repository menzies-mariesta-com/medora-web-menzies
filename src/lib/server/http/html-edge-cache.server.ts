import type { RequestEvent } from '@sveltejs/kit';

const HTML_PATH_RE =
	/^\/(medora|auth|onboarding|pricing|docs)(\/|$)/;

/** Netlify edge + browser revalidation for authenticated app shells. */
export function applyAuthenticatedHtmlCacheHeaders(
	event: RequestEvent,
	response: Response
): Response {
	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('text/html')) return response;
	if (!HTML_PATH_RE.test(event.url.pathname)) return response;
	if (response.status !== 200) return response;

	const headers = new Headers(response.headers);
	headers.set(
		'Cache-Control',
		'private, max-age=0, must-revalidate'
	);
	headers.set(
		'Netlify-CDN-Cache-Control',
		'private, durable, max-age=60, stale-while-revalidate=180'
	);
	headers.set('Vary', 'Cookie, Accept-Language');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}