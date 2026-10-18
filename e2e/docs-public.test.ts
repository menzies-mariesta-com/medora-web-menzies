import { expect, test } from '@playwright/test';

test.describe('public documentation', () => {
	test('docs overview loads', async ({ page }) => {
		const res = await page.goto('/docs');
		expect(res?.status()).toBeLessThan(500);
		await expect(page.getByRole('heading', { name: /Medora documentation/i })).toBeVisible();
	});

	test('workflow page loads', async ({ page }) => {
		const res = await page.goto('/docs/workflows/registration-patient-registration');
		expect(res?.status()).toBeLessThan(500);
	});

	test('workflow capture image resolves', async ({ page }) => {
		await page.goto('/docs/workflows/consultation-procedures');
		const img = page.locator('figure.docs-figure img.docs-figure-img').first();
		await expect(img).toBeVisible();
		const src = await img.getAttribute('src');
		expect(src).toBeTruthy();
		expect(src).not.toMatch(/^\/docs\/capture\/workflows\//);
		const imgRes = await page.request.get(src!);
		expect(imgRes.status()).toBeLessThan(400);
	});
});
