import { error, type Cookies } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import { sessionTable } from '$lib/server/db/table/auth-table/auth-table';

export const COOKIE_SESSION_EXTENDED_FOR = 'heka_session_extended_for';
export const SESSION_EXTEND_SECONDS = 60 * 60 * 2;
export const UI_ONLY_SESSION_EXTEND_HEADER = 'x-medora-ui-session-extend';

export type SessionExtendResult = {
	sessionId: string;
	sessionExpiresAt: string;
	extendedOnce: true;
};

/**
 * Verify the signed-in user's password, then extend the current session once.
 * Also refreshes the Better Auth session_token cookie maxAge so the browser
 * keeps the cookie past the original login window (DB-only updates were not enough).
 */
export async function extendSessionWithPassword(input: {
	cookies: Cookies;
	headers: Headers;
	userId: string;
	sessionId: string;
	password: string;
}): Promise<SessionExtendResult> {
	const password = input.password;
	if (typeof password !== 'string' || !password.trim()) {
		throw error(400, 'Password is required');
	}

	const extendedFor = input.cookies.get(COOKIE_SESSION_EXTENDED_FOR);
	if (extendedFor === input.sessionId) {
		throw error(409, 'Session already extended once');
	}

	try {
		await auth.api.verifyPassword({
			body: { password },
			headers: input.headers
		});
	} catch {
		// Never log the password. Treat any verify failure as invalid credentials.
		throw error(401, 'Invalid password');
	}

	const newExpiresAt = new Date(
		Date.now() + SESSION_EXTEND_SECONDS * 1000
	).toISOString();

	const updated = await ensureDb()
		.update(sessionTable)
		.set({ expiresAt: newExpiresAt })
		.where(
			and(
				eq(sessionTable.id, input.sessionId),
				eq(sessionTable.userId, input.userId)
			)
		)
		.returning({ id: sessionTable.id });

	if (!updated.length) {
		throw error(404, 'Session not found');
	}

	await refreshSessionTokenCookieMaxAge(
		input.cookies,
		SESSION_EXTEND_SECONDS
	);

	input.cookies.set(COOKIE_SESSION_EXTENDED_FOR, input.sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: SESSION_EXTEND_SECONDS * 2
	});

	return {
		sessionId: input.sessionId,
		sessionExpiresAt: newExpiresAt,
		extendedOnce: true
	};
}

/**
 * Re-set the existing signed Better Auth session_token with a fresh maxAge.
 * The cookie value (token + HMAC) stays the same; only lifetime is renewed.
 */
async function refreshSessionTokenCookieMaxAge(
	cookies: Cookies,
	maxAgeSeconds: number
): Promise<void> {
	const ctx = await auth.$context;
	const { name, attributes } = ctx.authCookies.sessionToken;
	const currentValue = cookies.get(name);
	if (!currentValue) {
		throw error(401, 'Missing session cookie');
	}

	cookies.set(name, currentValue, {
		path: attributes.path ?? '/',
		httpOnly: attributes.httpOnly ?? true,
		sameSite: (attributes.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
		secure: attributes.secure ?? false,
		...(attributes.domain ? { domain: attributes.domain } : {}),
		maxAge: maxAgeSeconds
	});
}
