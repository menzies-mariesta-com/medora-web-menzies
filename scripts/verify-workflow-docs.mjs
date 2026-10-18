import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = join(root, 'src/lib/docs/content/workflows');
const captureRoot = join(root, 'src/lib/docs/asset/capture/workflows');
const strict = process.env.DOCS_VERIFY_STRICT === '1';

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};
	const out = {};
	for (const line of match[1].split('\n')) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		let val = kv[2].trim();
		if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
		out[kv[1]] = val;
	}
	return out;
}

const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.md'));
let complete = 0;
let warnings = 0;
const errors = [];

for (const file of files) {
	const raw = readFileSync(join(workflowsDir, file), 'utf8');
	const fm = parseFrontmatter(raw);
	if (fm.captureStatus !== 'complete') continue;
	complete++;
	const slug = file.replace(/\.md$/, '');
	if (raw.includes('## Related APIs')) {
		errors.push(`${file}: captured docs must not include "## Related APIs"`);
	}
	const shotDir = join(captureRoot, slug);
	let shotCount = 0;
	if (existsSync(shotDir)) {
		shotCount = readdirSync(shotDir).filter((n) => /\.(png|webp|jpg)$/i.test(n)).length;
	}
	const refs = (raw.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length;
	const minShots = Math.max(1, refs);
	if (shotCount < minShots && refs > 0) {
		errors.push(
			`${file}: expected at least ${refs} screenshot(s) in src/lib/docs/asset/capture/workflows/${slug}`
		);
	}
	if (refs < 1) {
		warnings++;
		if (strict) errors.push(`${file}: captureStatus complete but no image markdown refs`);
	}
}

if (errors.length > 0) {
	console.error('verify-workflow-docs failed:');
	for (const e of errors) console.error(`  ${e}`);
	process.exit(1);
}

if (complete === 0) {
	console.log(
		'verify-workflow-docs: ok (no captured workflows yet; set DOCS_VERIFY_STRICT=1 after full capture)'
	);
} else {
	console.log(`verify-workflow-docs: ok (${complete} captured workflow docs)`);
}
