/**
 * Every public +page.svelte must use SeoHead or inherit noindex from a parent +layout.svelte.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const ROUTES = join(ROOT, 'src', 'routes');

function walk(dir, out) {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, name.name);
		if (name.isDirectory()) walk(p, out);
		else if (name.name === '+page.svelte') out.push(p);
	}
}

function read(path) {
	try {
		return readFileSync(path, 'utf8');
	} catch {
		return '';
	}
}

function hasNoindex(content) {
	return /meta\s+name=(["'])robots\1[^>]*content=(["'])[^"']*noindex/i.test(
		content
	);
}

function hasSeoHead(content) {
	return /<SeoHead\b/.test(content) || /from\s+['"][^'"]*SeoHead\.svelte['"]/.test(
		content
	);
}

/** Walk from page directory up to src/routes for +layout.svelte with noindex. */
function layoutChainHasNoindex(pagePath) {
	let dir = dirname(pagePath);
	const routesRoot = ROUTES;
	while (dir.startsWith(routesRoot) && dir.length >= routesRoot.length) {
		const layout = join(dir, '+layout.svelte');
		if (existsSync(layout) && hasNoindex(read(layout))) return true;
		if (dir === routesRoot) break;
		dir = dirname(dir);
	}
	return false;
}

function isPublicPage(pagePath) {
	const rel = relative(ROUTES, pagePath).replace(/\\/g, '/');
	return rel === '+page.svelte' || rel.startsWith('(public)/');
}

const pages = [];
walk(ROUTES, pages);

const violations = [];

for (const pagePath of pages) {
	if (!isPublicPage(pagePath)) continue;
	const content = read(pagePath);
	if (hasSeoHead(content)) continue;
	if (hasNoindex(content)) continue;
	if (layoutChainHasNoindex(pagePath)) continue;
	violations.push(relative(ROOT, pagePath));
}

if (violations.length) {
	console.error(
		'check-public-seo: public pages must use SeoHead or noindex (page or layout):\n'
	);
	for (const v of violations) console.error(`  - ${v}`);
	process.exit(1);
}

console.log('check-public-seo: OK');
