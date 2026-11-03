import { error, type Cookies } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import { sessionTable } from '$lib/server/db/table/auth-table/auth-table';
import {
	cookieMaxAgeSecondsForExpiry,
	computeExtendedSessionExpiry
} from '$lib/server/medora/auth/session-policy.server';

export const UI_ONLY_SESSION_EXTEND_HEADER = 'x-medora-ui-session-extend';

export type SessionExtendResult = {
	sessionId: string;
	sessionExpiresAt: string;
};

/**
 * Verify the signed-in user's password, then extend the current session (12h from extend time).
 * May be used multiple times; each extend grants up to {@link AppEnum.MAX_SESSION_SECONDS} from the extend moment.
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

	try {
		await auth.api.verifyPassword({
			body: { password },
			headers: input.headers
		});
	} catch {
		throw error(401, 'Invalid password');
	}

	const [existing] = await ensureDb()
		.select({ expiresAt: sessionTable.expiresAt })
		.from(sessionTable)
		.where(
			and(
				eq(sessionTable.id, input.sessionId),
				eq(sessionTable.userId, input.userId)
			)
		)
		.limit(1);

	if (!existing) {
		throw error(404, 'Session not found');
	}

	const newExpiresAt = computeExtendedSessionExpiry({
		currentExpiresAt: existing.expiresAt
	});

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

	await refreshSessionTokenCookieMaxAge(input.cookies, newExpiresAt);

	return {
		sessionId: input.sessionId,
		sessionExpiresAt: newExpiresAt
	};
}

async function refreshSessionTokenCookieMaxAge(
	cookies: Cookies,
	expiresAt: string
): Promise<void> {
	const ctx = await auth.$context;
	const { name, attributes } = ctx.authCookies.sessionToken;
	const currentValue = cookies.get(name);
	if (!currentValue) {
		throw error(401, 'Missing session cookie');
	}

	const maxAge = cookieMaxAgeSecondsForExpiry(expiresAt);

	cookies.set(name, currentValue, {
		path: attributes.path ?? '/',
		httpOnly: attributes.httpOnly ?? true,
		sameSite: (attributes.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
		secure: attributes.secure ?? false,
		...(attributes.domain ? { domain: attributes.domain } : {}),
		maxAge
	});
}
