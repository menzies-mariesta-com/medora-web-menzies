import { expect, test } from '@playwright/test';

async function expectIndexableSeo(page: import('@playwright/test').Page) {
	expect(await page.title()).toMatch(/.+/);
	const description = page.locator('meta[name="description"]');
	await expect(description).toHaveAttribute('content', /.+/);
	const canonical = page.locator('link[rel="canonical"]');
	await expect(canonical).toHaveAttribute('href', /^https?:\/\/.+/);
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
		'content',
		/.+/
	);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
		'content',
		/^https?:\/\/.+/
	);
	await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
		'content',
		'summary_large_image'
	);
	const lang = await page.locator('html').getAttribute('lang');
	expect(lang).toBeTruthy();
	expect(lang).not.toBe('%paraglide.lang%');
}

test.describe('public SEO meta', () => {
	test('home has full SEO head', async ({ page }) => {
		const res = await page.goto('/');
		expect(res?.status()).toBeLessThan(500);
		await expectIndexableSeo(page);
	});

	test('pricing has full SEO head', async ({ page }) => {
		const res = await page.goto('/pricing');
		expect(res?.status()).toBeLessThan(500);
		await expectIndexableSeo(page);
	});

	test('docs overview has full SEO head', async ({ page }) => {
		const res = await page.goto('/docs');
		expect(res?.status()).toBeLessThan(500);
		await expectIndexableSeo(page);
	});

	test('sample workflow doc has full SEO head', async ({ page }) => {
		const res = await page.goto(
			'/docs/workflows/registration-patient-registration'
		);
		expect(res?.status()).toBeLessThan(500);
		await expectIndexableSeo(page);
	});

	test('auth login is noindex', async ({ page }) => {
		await page.goto('/auth/login');
		const robots = page.locator('meta[name="robots"]').first();
		await expect(robots).toHaveAttribute(
			'content',
			/noindex/i
		);
	});
});
