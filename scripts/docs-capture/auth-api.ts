import type { BrowserContext, Page } from '@playwright/test';
import { promptTotpCode } from './prompt.ts';

function credentials() {
	const email = process.env.SEED_ADMIN_EMAIL?.trim();
	const password = process.env.SEED_ADMIN_PASSWORD?.trim();
	if (!email || !password) {
		throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
	}
	return { email, password };
}

function requestOrigin(page: Page): string {
	const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4002';
	try {
		return new URL(page.url()).origin;
	} catch {
		return new URL(base).origin;
	}
}

type SignInBody = {
	twoFactorRedirect?: boolean;
	user?: unknown;
	message?: string;
};

/** Sign-in + optional TOTP via Better Auth HTTP API (reliable in Playwright). */
export async function loginWithBetterAuthApi(
	page: Page,
	context: BrowserContext,
	totpPrompt: (reason: string) => Promise<string> = promptTotpCode
): Promise<void> {
	const { email, password } = credentials();
	const origin = requestOrigin(page);
	const headers = { origin, 'content-type': 'application/json' };

	const signInRes = await context.request.post('/api/auth/sign-in/email', {
		data: { email, password, callbackURL: '/medora' },
		headers
	});
	const signInBody = (await signInRes.json().catch(() => ({}))) as SignInBody;

	if (!signInRes.ok() && !signInBody.twoFactorRedirect) {
		throw new Error(
			`Sign-in failed (HTTP ${signInRes.status()}). Check SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. ${signInBody.message ?? ''}`
		);
	}

	if (signInBody.twoFactorRedirect) {
		const maxAttempts = 12;
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const code = await totpPrompt(
				attempt === 1
					? 'Sign-in needs two-factor authentication. Open your authenticator app.'
					: `Invalid or expired code (attempt ${attempt}/${maxAttempts}). Enter a new 6-digit code.`
			);
			const verifyRes = await context.request.post('/api/auth/two-factor/verify-totp', {
				data: { code, trustDevice: true },
				headers
			});
			if (verifyRes.ok()) break;
			const verifyBody = await verifyRes.json().catch(() => ({}));
			const msg = (verifyBody as { message?: string }).message ?? verifyRes.statusText();
			console.log(`2FA verify failed: ${msg}`);
			if (attempt === maxAttempts) {
				throw new Error('Could not verify 2FA after multiple attempts.');
			}
		}
	}

	await page.goto('/medora', { waitUntil: 'domcontentloaded' });
	const path = new URL(page.url()).pathname;
	if (path.includes('/auth/login') || path.includes('/auth/two-factor')) {
		throw new Error(
			'Login did not complete. Confirm seed admin credentials and enter a valid authenticator code.'
		);
	}
}
