import { expect, test } from '@playwright/test';

test('marketing home shows hero and sign-in path', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
	await expect(
		page.getByRole('link', { name: /sign in/i }).first()
	).toBeVisible();
	await expect(page.locator('#how-it-works')).toBeVisible();
});
