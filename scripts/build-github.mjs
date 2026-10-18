/**
 * GitHub Actions / low-RAM CI production build.
 *
 * SvelteKit SSR + client run in one Node process; this app peaks above 10 GiB heap.
 * Keep in sync with .github/workflows/netlify-build.yml (swap + this script).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, '..');
const viteBin = join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const paraglideScript = join(scriptsDir, 'compile-paraglide.mjs');

function run(label, command, args, extraEnv = {}) {
	console.log(`\n> ${label}`);
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		stdio: 'inherit',
		env: {
			...process.env,
			NETLIFY: 'true',
			...extraEnv
		}
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

run('paraglide:ci', process.execPath, [
	'--max-old-space-size=4096',
	paraglideScript
]);

// 16 GiB V8 heap — SSR alone exceeded 10 GiB on ubuntu-latest (see log.md).
run('vite build', process.execPath, ['--max-old-space-size=16384', viteBin, 'build']);
