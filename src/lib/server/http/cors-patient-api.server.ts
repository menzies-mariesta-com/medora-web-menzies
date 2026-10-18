import { env } from '$env/dynamic/private';

const DEFAULT_ORIGINS = ['http://localhost:4002', 'http://127.0.0.1:4002'];

function allowedOrigins(): string[] {
	const fromEnv = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
	const mobile = (env.PATIENT_MOBILE_CORS_ORIGINS ?? '')
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
	return Array.from(new Set([...DEFAULT_ORIGINS, ...fromEnv, ...mobile]));
}

export function corsHeadersForRequest(request: Request): Headers {
	const headers = new Headers();
	const origin = request.headers.get('origin');
	const allowed = allowedOrigins();
	if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
		headers.set('Access-Control-Allow-Origin', origin);
		headers.set('Vary', 'Origin');
	} else if (!origin) {
		headers.set('Access-Control-Allow-Origin', '*');
	}
	headers.set(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, PATCH, DELETE, OPTIONS'
	);
	headers.set(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, Accept'
	);
	headers.set(
		'Access-Control-Expose-Headers',
		'set-auth-token, Set-Auth-Token'
	);
	headers.set('Access-Control-Max-Age', '86400');
	return headers;
}

export function applyCorsToResponse(
	response: Response,
	request: Request
): Response {
	const cors = corsHeadersForRequest(request);
	const merged = new Headers(response.headers);
	for (const [k, v] of cors.entries()) {
		merged.set(k, v);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: merged
	});
}

export function optionsPreflightResponse(request: Request): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeadersForRequest(request)
	});
}
