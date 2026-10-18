import { expect, test } from '@playwright/test';

test.describe('public marketing pages', () => {
	test('home loads', async ({ page }) => {
		const res = await page.goto('/');
		expect(res?.status()).toBeLessThan(500);
	});

	test('pricing loads', async ({ page }) => {
		const res = await page.goto('/pricing');
		expect(res?.status()).toBeLessThan(500);
		await expect(page.getByRole('heading', { name: /pricing/i }).first()).toBeVisible();
	});
});
