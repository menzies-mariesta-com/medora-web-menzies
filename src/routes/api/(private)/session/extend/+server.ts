import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	extendSessionWithPassword,
	UI_ONLY_SESSION_EXTEND_HEADER
} from '$lib/server/medora/auth/session-extend.server';

/** Must not live under `/api/auth/*` — `hooks.server.ts` forwards that prefix to Better Auth only. */
export const POST: RequestHandler = async ({
	request,
	locals,
	cookies
}) => {
	if (!locals.user || !locals.session)
		throw error(401, 'Unauthorized');

	// Enforce that session extension is initiated by the UI button.
	// This prevents non-UI code paths from extending session expiry.
	const headerValue = request.headers.get(UI_ONLY_SESSION_EXTEND_HEADER);
	if (headerValue !== '1') {
		throw error(403, 'Forbidden');
	}

	const sessionId = locals.session.id;
	if (!sessionId) throw error(400, 'Missing session id');

	let body: { password?: unknown } = {};
	try {
		body = (await request.json()) as { password?: unknown };
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const password =
		typeof body.password === 'string' ? body.password : '';

	const result = await extendSessionWithPassword({
		cookies,
		headers: request.headers,
		userId: locals.user.id,
		sessionId,
		password
	});

	return json(result);
};
