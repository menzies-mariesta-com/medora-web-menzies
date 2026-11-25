import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { bearer, emailOTP, twoFactor } from 'better-auth/plugins';
import { eq, sql } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { uuidV7 } from '$lib/util/id.util';
import {
	accountTable,
	sessionTable,
	twoFactorTable,
	userTable,
	verificationTable
} from '$lib/server/db/table/auth-table/auth-table';
import { renderResetPasswordEmail } from '$lib/asset/email/reset-password';
import { tryConsumePasswordResetCapture } from '$lib/server/auth/capture-password-reset-url.server';
import { renderOtpVerificationEmail } from '$lib/asset/email/otp-verification';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import { PasswordHashUtil } from '$lib/server/auth/password-hash.server';
import { env } from '$env/dynamic/private';
import { authLogger } from '$lib/logger';
import { AppEnum } from '$lib/model/enum/app.enum';

const passwordHashUtil = new PasswordHashUtil();
const baseURL = env.BETTER_AUTH_BASE_URL || 'http://localhost:4002';

function normalizeOrigin(
	value: string | null | undefined
): string | null {
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
	'medora-build-placeholder-better-auth-secret-min-32-chars!!';

function resolveBetterAuthSecret(): string {
	const s = env.BETTER_AUTH_SECRET?.trim();
	if (s) return s;
	authLogger.warn(
		'BETTER_AUTH_SECRET is not set; using a placeholder. Set BETTER_AUTH_SECRET in production.'
	);
	return BETTER_AUTH_SECRET_PLACEHOLDER;
}

export const auth = betterAuth({
	appName: 'Medora',
	secret: resolveBetterAuthSecret(),
	baseURL,
	trustedOrigins,
	session: {
		// Fixed lifetime at login (12h). Manual extend resets to 12h from confirmation time.
		expiresIn: AppEnum.MAX_SESSION_SECONDS,
		disableSessionRefresh: true
	},
	database: drizzleAdapter(db!, {
		provider: 'pg',
		schema: {
			user: userTable,
			session: sessionTable,
			account: accountTable,
			verification: verificationTable,
			twoFactor: twoFactorTable
		}
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		password: {
			hash: (password) => passwordHashUtil.hash(password),
			verify: ({ password, hash }) =>
				passwordHashUtil.verify({ password, hash })
		},
		resetPasswordTokenExpiresIn: AppEnum.PASSWORD_RESET_TTL_SECONDS,
		sendResetPassword: async ({ user, url }) => {
			if (tryConsumePasswordResetCapture(user.email, url)) return;
			const { html, plainText } = renderResetPasswordEmail({ url });
			void sendEmailServer({
				to: user.email,
				subject: 'Reset your Medora password',
				message: plainText,
				html
			});
		},
		/**
		 * Setting a password through the emailed link is the moment an invited
		 * staff account becomes usable. Record it so the staff list can tell
		 * "invite never used" from "invite accepted".
		 */
		onPasswordReset: async ({ user }) => {
			const database = db;
			if (!database) return;
			try {
				await database
					.update(userTable)
					.set({ accountActivatedAt: sql`now()` })
					.where(eq(userTable.id, user.id));
			} catch (err) {
				authLogger.error(
					'[auth] Failed to stamp accountActivatedAt',
					err instanceof Error ? err : { error: String(err) }
				);
			}
		}
	},
	advanced: {
		database: {
			// Use UUIDv7 for Better Auth ids (stored as text).
			generateId: () => uuidV7()
		}
	},
	plugins: [
		bearer(),
		twoFactor({
			issuer: 'Medora',
			/** Trusted-device cookie + verification row lifetime (3 days). */
			trustDeviceMaxAge: 60 * 60 * 24 * 3
		}),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				const { html, plainText, subject } =
					renderOtpVerificationEmail({ otp, type });
				void sendEmailServer({
					to: email,
					subject,
					message: plainText,
					html
				});
			}
		}),
		sveltekitCookies(getRequestEvent)
		// make sure this is the last plugin in the array
	]
});
