import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

/**
 * Baseline security headers for HTML and API responses.
 * CSP allows inline scripts in app.html FOUC guards and SvelteKit hydration.
 */
export function buildContentSecurityPolicy(isProductionHttps: boolean): string {
	const parts = [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self'",
		"form-action 'self'"
	];
	if (isProductionHttps) {
		parts.push('upgrade-insecure-requests');
	}
	return parts.join('; ');
}

function isSensitivePath(pathname: string): boolean {
	return (
		pathname.startsWith('/medora') ||
		pathname.startsWith('/api/') ||
		pathname.startsWith('/auth')
	);
}

/** Merge security headers onto a SvelteKit or auth handler response. */
export function applySecurityHeaders(
	response: Response,
	event: RequestEvent
): Response {
	const headers = new Headers(response.headers);

	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=()'
	);
	headers.set('X-Frame-Options', 'SAMEORIGIN');
	const proto =
		event.request.headers.get('x-forwarded-proto') ??
		event.url.protocol.replace(':', '');
	const productionHttps = !dev && proto === 'https';
	headers.set(
		'Content-Security-Policy',
		buildContentSecurityPolicy(productionHttps)
	);

	if (productionHttps) {
		headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains'
		);
	}

	if (isSensitivePath(event.url.pathname)) {
		headers.set(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, private'
		);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
