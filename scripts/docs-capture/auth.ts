import type { BrowserContext, Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { STORAGE_STATE_PATH } from './constants.ts';
import { loginWithBetterAuthApi } from './auth-api.ts';

export function isAuthChallengeUrl(url: string): boolean {
	return (
		url.includes('/auth/login') ||
		url.includes('/auth/two-factor') ||
		url.includes('/auth/two-factor/')
	);
}

export async function loginSeedAdmin(page: Page, context: BrowserContext): Promise<void> {
	page.setDefaultTimeout(60_000);
	await page.goto('/auth/login', { waitUntil: 'load' });
	await loginWithBetterAuthApi(page, context);
}

export async function persistStorageState(context: BrowserContext): Promise<void> {
	await context.storageState({ path: STORAGE_STATE_PATH });
}

export async function tryLoadStorageState(context: BrowserContext): Promise<boolean> {
	if (!existsSync(STORAGE_STATE_PATH)) return false;
	try {
		const state = JSON.parse(readFileSync(STORAGE_STATE_PATH, 'utf8'));
		if (!state.cookies?.length) return false;
		await context.addCookies(state.cookies);
		return true;
	} catch {
		return false;
	}
}

/** Re-login and 2FA when session expires mid-capture. */
export async function ensureAuthenticated(
	page: Page,
	context: BrowserContext,
	reason = 'Session expired. Sign in again.'
): Promise<void> {
	if (isAuthChallengeUrl(page.url())) {
		console.log(reason);
		await loginSeedAdmin(page, context);
		await persistStorageState(context);
		return;
	}
	const res = await page.goto('/medora', { waitUntil: 'domcontentloaded' }).catch(() => null);
	if (res && isAuthChallengeUrl(page.url())) {
		console.log(reason);
		await loginSeedAdmin(page, context);
		await persistStorageState(context);
	}
}

export class AuthRequiredError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthRequiredError';
	}
}

export function authErrorFromPage(page: Page): AuthRequiredError | null {
	if (isAuthChallengeUrl(page.url())) {
		return new AuthRequiredError('Authentication or 2FA required');
	}
	return null;
}
