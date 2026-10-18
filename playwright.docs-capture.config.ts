import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4002';

export default defineConfig({
	testDir: 'scripts/docs-capture',
	testMatch: '**/*.spec.ts',
	timeout: 120_000,
	expect: { timeout: 15_000 },
	use: {
		baseURL,
		trace: 'off',
		screenshot: 'off',
		video: 'off',
		viewport: { width: 1280, height: 720 },
		actionTimeout: 20_000,
		navigationTimeout: 45_000
	},
	reporter: [['list']]
});
