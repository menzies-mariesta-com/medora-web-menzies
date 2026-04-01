import { dev } from '$app/environment';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { uuidv7 } from 'uuidv7';
import {
	accountTable,
	sessionTable,
	userTable,
	verificationTable
} from '$lib/server/db/table/auth-table/auth-table';
import { renderResetPasswordEmail } from '$lib/asset/email/reset-password';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { env } from '$env/dynamic/private';
import { authLogger } from '$lib/logger';

const passwordHashUtil = new PasswordHashUtil();
const baseURL = env.BETTER_AUTH_BASE_URL || 'http://localhost:5173';

function normalizeOrigin(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

const trustedOrigins = Array.from(
	new Set(
		[
			normalizeOrigin(baseURL),
			normalizeOrigin(env.BETTER_AUTH_URL),
			...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean)
				.map((v) => normalizeOrigin(v))
				.filter((v): v is string => Boolean(v))
		].filter((v): v is string => Boolean(v))
	)
);

/** Placeholder only when env is missing (e.g. Docker build). Production must set BETTER_AUTH_SECRET. */
const BETTER_AUTH_SECRET_PLACEHOLDER =
	'heka-build-placeholder-better-auth-secret-min-32-chars!!';

function resolveBetterAuthSecret(): string {
	const s = env.BETTER_AUTH_SECRET?.trim();
	if (s) return s;
	authLogger.warn(
		'BETTER_AUTH_SECRET is not set; using a placeholder. Set BETTER_AUTH_SECRET in production.'
	);
	return BETTER_AUTH_SECRET_PLACEHOLDER;
}

export const auth = betterAuth({
	secret: resolveBetterAuthSecret(),
	baseURL,
	trustedOrigins,
	session: {
		// Hard 2-hour session lifetime (no auto refresh extension),
		// so users are logged out automatically after inactivity/usage.
		expiresIn: 60 * 60 * 2,
		disableSessionRefresh: true
	},
	database: drizzleAdapter(db!, {
		provider: 'pg',
		schema: {
			user: userTable,
			session: sessionTable,
			account: accountTable,
			verification: verificationTable
		}
	}),
	emailAndPassword: {
		enabled: true,
		password: {
			hash: (password) => passwordHashUtil.hash(password),
			verify: ({ password, hash }) =>
				passwordHashUtil.verify({ password, hash })
		},
		sendResetPassword: async ({ user, url }) => {
			const { html, plainText } = renderResetPasswordEmail({ url });
			void sendEmailServer({
				to: user.email,
				subject: 'Reset your password',
				message: plainText,
				html
			});
		}
	},
	advanced: {
		database: {
			// Use UUIDv7 for Better Auth ids (stored as text).
			generateId: () => uuidv7()
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent)
		// make sure this is the last plugin in the array
	]
});
