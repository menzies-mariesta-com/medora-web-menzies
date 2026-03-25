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

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_BASE_URL || 'http://localhost:5173',
	trustedOrigins,
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
