import { defineConfig } from '@playwright/test';

const e2ePort = 4173;

export default defineConfig({
	webServer: {
		command: `NODE_OPTIONS=--max-old-space-size=8192 npm run dev -- --port ${e2ePort} --host 127.0.0.1`,
		port: e2ePort,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'e2e',
	timeout: 120_000
});
