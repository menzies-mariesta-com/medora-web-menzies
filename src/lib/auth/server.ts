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

const passwordHashUtil = new PasswordHashUtil();
const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
	.split(',')
	.map((v) => v.trim())
	.filter(Boolean);

const authSecret = env.BETTER_AUTH_SECRET;

/**
 * IMPORTANT:
 * During Docker/Fly builds, required secrets/env vars may be absent.
 * SvelteKit still imports this module during `pnpm run build`, so we must
 * avoid eagerly calling `betterAuth()` when config isn't available.
 */
const missingConfigError = new Error(
	'Auth is not initialized. Missing BETTER_AUTH_SECRET and/or DATABASE_URL.'
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = !authSecret || !db
	? new Proxy(
			{},
			{
				get() {
					throw missingConfigError;
				}
			}
		) as any
	: betterAuth({
			secret: authSecret,
			baseURL: env.BETTER_AUTH_BASE_URL || 'http://localhost:5173',
			trustedOrigins,
			database: drizzleAdapter(db, {
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
