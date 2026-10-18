/**
 * Security markup boundary:
 * - {@html} only in allowlisted Svelte files
 * - No private env imports in UI / client Svelte modules
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/** Paths relative to repo root. */
const HTML_ALLOWLIST = new Set([
	'src/lib/component/own/snippet/seo/SeoHead.svelte',
	'src/lib/component/own/global/public/docs/DocsArticle.svelte',
	'src/lib/component/own/library/mari/text-editor/rich-editor/MariRichEditorPreview.svelte'
]);

const PRIVATE_ENV =
	/\$env\/static\/private|\$env\/dynamic\/private|\$app\/env\/private/;

const HTML_USE = /\{@html\b/;

function walk(dir, out) {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		if (name.name === 'node_modules' || name.name === '.git') continue;
		const p = join(dir, name.name);
		if (name.isDirectory()) walk(p, out);
		else out.push(p);
	}
}

const files = [];
walk(join(ROOT, 'src'), files);

const violations = [];

for (const filePath of files) {
	const rel = relative(ROOT, filePath).replace(/\\/g, '/');
	const isUiSvelte = rel.endsWith('.svelte') && !rel.includes('/lib/server/');
	const isClientModule =
		rel.endsWith('.svelte.ts') && !rel.includes('/lib/server/');

	if (!isUiSvelte && !isClientModule) continue;

	let text;
	try {
		text = readFileSync(filePath, 'utf8');
	} catch {
		continue;
	}

	const withoutBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
	if (
		HTML_USE.test(withoutBlockComments) &&
		isUiSvelte &&
		!HTML_ALLOWLIST.has(rel)
	) {
		violations.push(`${rel}: {@html} not allowlisted`);
	}

	if (PRIVATE_ENV.test(text)) {
		violations.push(`${rel}: private env import in client/UI module`);
	}
}

if (violations.length) {
	console.error('check-security-markup failed:\n');
	for (const v of violations) console.error(`  - ${v}`);
	process.exit(1);
}

console.log('check-security-markup: OK');
