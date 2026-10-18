import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_PATHS = [
	'/',
	'/pricing',
	'/docs',
	'/docs/workflows/registration-patient-registration'
] as const;

const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

test.describe('public accessibility (axe)', () => {
	for (const path of PUBLIC_PATHS) {
		test(`no critical or serious violations on ${path}`, async ({
			page
		}, testInfo) => {
			const res = await page.goto(path);
			expect(res?.status()).toBeLessThan(500);

			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();

			const blocking = results.violations.filter((v) =>
				BLOCKING_IMPACTS.has(v.impact ?? '')
			);

			if (blocking.length) {
				await testInfo.attach('axe-violations', {
					body: JSON.stringify(blocking, null, 2),
					contentType: 'application/json'
				});
			}

			expect(
				blocking,
				`axe violations on ${path}: ${blocking.map((v) => v.id).join(', ')}`
			).toEqual([]);
		});
	}
});
