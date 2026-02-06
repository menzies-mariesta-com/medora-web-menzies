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

const passwordHashUtil = new PasswordHashUtil();

export const auth = betterAuth({
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
