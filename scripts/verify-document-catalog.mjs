import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
	'npx',
	['tsx', 'scripts/verify-document-catalog.run.ts'],
	{ cwd: root, stdio: 'inherit' }
);

process.exit(result.status === 0 ? 0 : result.status ?? 1);
