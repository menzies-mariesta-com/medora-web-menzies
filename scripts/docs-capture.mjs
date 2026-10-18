import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extraArgs = process.argv.slice(2);

function run(cmd, args, env = {}) {
	const r = spawnSync(cmd, args, {
		cwd: root,
		stdio: 'inherit',
		env: { ...process.env, ...env }
	});
	if (r.status !== 0) process.exit(r.status ?? 1);
}

const useDb2fa = process.env.DOCS_CAPTURE_USE_DB_2FA_TOGGLE === '1';
const skip2fa = process.env.DOCS_CAPTURE_SKIP_2FA_TOGGLE === '1';
const toggleEnv = { DOCS_CAPTURE_ALLOW_2FA_TOGGLE: '1' };

let restored = false;
function restore() {
	if (restored || skip2fa || !useDb2fa) return;
	restored = true;
	run('node', ['scripts/docs-capture-2fa.mjs', 'restore'], toggleEnv);
}

process.on('SIGINT', () => {
	restore();
	process.exit(130);
});

if (useDb2fa && !skip2fa) {
	run('node', ['scripts/docs-capture-2fa.mjs', 'disable'], toggleEnv);
} else {
	console.log(
		'docs:capture: interactive 2FA in terminal (set DOCS_CAPTURE_USE_DB_2FA_TOGGLE=1 to disable 2FA in DB instead)'
	);
}

const skipPreflight = process.env.DOCS_CAPTURE_SKIP_PREFLIGHT === '1';
if (!skipPreflight && !extraArgs.some((a) => a.startsWith('--slug='))) {
	run('npx', ['tsx', 'scripts/docs-capture/preflight.ts']);
} else if (skipPreflight) {
	console.log('docs:capture: skipping preflight (DOCS_CAPTURE_SKIP_PREFLIGHT=1)');
}

try {
	run('npx', ['tsx', 'scripts/docs-capture/run-capture.ts', ...extraArgs]);
} finally {
	restore();
}
