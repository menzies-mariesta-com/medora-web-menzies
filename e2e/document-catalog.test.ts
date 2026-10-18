import { expect, test } from '@playwright/test';

const SAMPLE_HOSPITAL_ID = '01900000-0000-7000-8000-000000000010';

test.describe('document template catalog routes', () => {
	test('template library page responds', async ({ page }) => {
		const res = await page.goto(
			`/medora/hospital/${SAMPLE_HOSPITAL_ID}/home/administration/document-master/template-library`
		);
		expect(res?.status()).toBeLessThan(500);
	});

	test('hospital templates page responds', async ({ page }) => {
		const res = await page.goto(
			`/medora/hospital/${SAMPLE_HOSPITAL_ID}/home/administration/document-master/hospital-templates`
		);
		expect(res?.status()).toBeLessThan(500);
	});
});
