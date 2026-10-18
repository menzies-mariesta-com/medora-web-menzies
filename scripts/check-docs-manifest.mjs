import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/lib/docs/manifest.json');
const seedPath = join(root, 'src/lib/server/db/seed/information-table-seed.ts');

const regen = process.argv.includes('--regen-manifest');
if (regen) {
	const gen = spawnSync('node', ['scripts/generate-docs-manifest.mjs'], {
		cwd: root,
		encoding: 'utf8'
	});
	if (gen.status !== 0) {
		console.error(gen.stderr || gen.stdout);
		process.exit(1);
	}
}

if (!readFileSync(manifestPath, 'utf8')) {
	console.error('check:docs-manifest failed: manifest missing. Run: npm run docs:manifest');
	process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const seed = readFileSync(seedPath, 'utf8');
const pageTuples = seed.matchAll(
	/\(\s*(\d+)\s*,\s*'[^']+'\s*,\s*(\d+)\s*,\s*\d+\s*,\s*(?:null|\d+)\s*,\s*'(\/medora\/home\/[^']+)'\s*,/g
);
const urls = new Set();
for (const m of pageTuples) urls.add(m[3]);

const workflowUrls = new Set(manifest.workflows.map((w) => w.pageUrl));
const missing = [...urls].filter((u) => !workflowUrls.has(u));

if (missing.length > 0) {
	console.error('check:docs-manifest failed: seed pages missing from manifest:');
	for (const u of missing.slice(0, 20)) console.error(`  ${u}`);
	console.error('Run: npm run docs:manifest');
	process.exit(1);
}

const verify = spawnSync('node', ['scripts/verify-workflow-docs.mjs'], {
	cwd: root,
	encoding: 'utf8'
});
if (verify.status !== 0) {
	console.error(verify.stderr || verify.stdout);
	process.exit(verify.status ?? 1);
}

console.log(`check:docs-manifest: ok (${manifest.workflows.length} workflows)`);
