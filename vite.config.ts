import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
	readFileSync(join(__dirname, 'package.json'), 'utf-8')
) as { version: string };

const paraglideRoot = join(__dirname, 'src/lib/paraglide');
const paraglideRootNorm = normalize(paraglideRoot);

/**
 * Paraglide is compiled by CLI only (`npm run paraglide`).
 *
 * Dev workflow:
 * 1. Run `npm run paraglide` after editing `messages/*.json` (or once after clone).
 * 2. Run `npm run dev` in a separate terminal (dev does NOT compile paraglide).
 * 3. Restart `npm run dev` after paraglide recompiles. Do not rely on HMR for
 *    `src/lib/paraglide/**`; Vite ignores and blocks hot updates for that tree.
 *
 * Optional: `npm run dev:with-paraglide` compiles then starts dev (slow on every start).
 *
 * Keep `@inlang/paraglide-js` pinned to 2.9.1 (exact). Newer 2.25.x pulls
 * `@lix-js/sdk` 0.17+ which fails compile with LIX_READ_RESOURCE_EXHAUSTED
 * ("buffered read result exceeds its byte or row budget") at ~195 locales
 * / ~30MB of messages. No documented env budget override.
 *
 * Do not re-enable `paraglideVitePlugin` without pinning output structure and
 * `cleanOutdir: false`. The plugin's dev default races Vite import analysis
 * at scale and causes "Failed to parse source for import analysis" errors.
 *
 * Default compile uses `locale-modules` (~200 files). Use
 * `npm run paraglide:message-modules:clean` before release builds if you need
 * per-message tree-shaking.
 */
const paraglideRuntimePath = join(paraglideRoot, 'runtime.js');

function isParaglideGeneratedPath(filePath: string): boolean {
	const normalized = normalize(filePath);
	return (
		normalized === paraglideRootNorm ||
		normalized.startsWith(paraglideRootNorm + '/') ||
		normalized.startsWith(paraglideRootNorm + '\\')
	);
}

/** Block HMR / full reload when paraglide output changes during dev. */
function paraglideDevIsolation(): Plugin {
	return {
		name: 'paraglide-dev-isolation',
		enforce: 'pre',
		configureServer(server: ViteDevServer) {
			server.watcher.unwatch(paraglideRoot);
		},
		handleHotUpdate(ctx) {
			if (isParaglideGeneratedPath(ctx.file)) {
				return [];
			}
		},
	};
}

/** SSR safety net when paraglide message modules resolve runtime relatively. */
function paraglideMessageRuntimeResolve(): Plugin {
	return {
		name: 'paraglide-message-runtime-resolve',
		enforce: 'pre',
		resolveId(source, importer) {
			if (
				source === '../runtime.js' &&
				importer?.includes('/src/lib/paraglide/messages/')
			) {
				return paraglideRuntimePath;
			}
		}
	};
}

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	server: {
		allowedHosts: ['host.docker.internal'],
		watch: {
			// Chokidar may still see writes; paraglideDevIsolation unwatch + handleHotUpdate [] is the real guard.
			ignored: [
				'**/src/lib/paraglide/**',
				`${paraglideRoot}/**`,
				(path: string) => isParaglideGeneratedPath(path)
			]
		}
	},
	plugins: [
		paraglideDevIsolation(),
		paraglideMessageRuntimeResolve(),
		tailwindcss(),
		sveltekit(),
		devtoolsJson()
	],
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
