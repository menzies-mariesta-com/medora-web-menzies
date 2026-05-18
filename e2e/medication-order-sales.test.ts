import { expect, test } from '@playwright/test';

/**
 * Medication order sales — structural checks (auth may be required in CI).
 * Full stock-deduct flows need a seeded hospital session.
 */
test.describe('medication order sales routes', () => {
	test('internal sales page route responds', async ({ page }) => {
		const res = await page.goto('/heka/home/medication-order/internal-sales');
		expect(res?.status()).toBeLessThan(500);
	});

	test('external sales page route responds', async ({ page }) => {
		const res = await page.goto('/heka/home/medication-order/external-sales');
		expect(res?.status()).toBeLessThan(500);
	});
});
