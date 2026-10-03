import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
	readFileSync(join(__dirname, 'package.json'), 'utf-8')
) as { version: string };

/**
 * Paraglide is compiled by CLI only (`pnpm run paraglide` / `paraglide:watch`).
 *
 * Do not re-enable `paraglideVitePlugin` without pinning
 * `outputStructure: 'message-modules'` and `cleanOutdir: false`.
 * The plugin's dev default (`locale-modules` + clean outdir) deletes
 * `src/lib/paraglide` and rewrites to `messages/<locale>.js`, which races
 * Vite import analysis after expanding to ~200 locales and causes:
 * "Failed to parse source for import analysis" / missing `./en.js`.
 */
export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	server: {
		allowedHosts: ['host.docker.internal']
	},
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
