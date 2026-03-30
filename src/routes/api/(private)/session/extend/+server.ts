import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureDb } from '$lib/server/db';
import { sessionTable } from '$lib/server/db/table/auth-table/auth-table';
import { eq } from 'drizzle-orm/sql/expressions/conditions';

/** Must not live under `/api/auth/*` — `hooks.server.ts` forwards that prefix to Better Auth only. */
const COOKIE_SESSION_EXTENDED_FOR = 'heka_session_extended_for';
const EXTEND_SECONDS = 60 * 60 * 2;
const UI_ONLY_HEADER = 'x-heka-ui-session-extend';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user || !locals.session) throw error(401, 'Unauthorized');

	// Enforce that session extension is initiated by the UI button.
	// This prevents non-UI code paths from extending session expiry.
	const headerValue = request.headers.get(UI_ONLY_HEADER);
	if (headerValue !== '1') {
		throw error(403, 'Forbidden');
	}

	const sessionId = locals.session.id;
	if (!sessionId) throw error(400, 'Missing session id');

	const extendedFor = cookies.get(COOKIE_SESSION_EXTENDED_FOR);
	if (extendedFor === sessionId) {
		throw error(409, 'Session already extended once');
	}

	const newExpiresAt = new Date(Date.now() + EXTEND_SECONDS * 1000).toISOString();

	await ensureDb()
		.update(sessionTable)
		.set({ expiresAt: newExpiresAt })
		.where(eq(sessionTable.id, sessionId));

	cookies.set(COOKIE_SESSION_EXTENDED_FOR, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: EXTEND_SECONDS * 2
	});

	return json({
		sessionId,
		sessionExpiresAt: newExpiresAt,
		extendedOnce: true
	});
};
