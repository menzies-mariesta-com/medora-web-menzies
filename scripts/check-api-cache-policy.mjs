import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(
	root,
	'src/lib/server/http/api-route-cache-policy.generated.ts'
);

const before = fs.readFileSync(target, 'utf8');
execSync('node scripts/generate-api-cache-policy.mjs', {
	cwd: root,
	stdio: 'pipe'
});
const after = fs.readFileSync(target, 'utf8');

if (before !== after) {
	console.error(
		'check:api-cache-policy: generated file is stale — run node scripts/generate-api-cache-policy.mjs'
	);
	process.exit(1);
}

console.log('check:api-cache-policy: ok (207 routes)');