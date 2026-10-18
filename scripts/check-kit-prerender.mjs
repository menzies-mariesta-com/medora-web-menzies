/**
 * SvelteKit: prerendered routes cannot export form actions on the same route
 * (or under a prerendered +layout.server.ts). Mutations use mirrored API routes.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const routesRoot = join(root, 'src/routes');

const PRERENDER_RE = /export\s+const\s+prerender\s*=\s*true\b/;
const ACTIONS_RE = /export\s+const\s+actions\b/;

function walk(dir, fileName, out) {
	for (const ent of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, ent.name);
		if (ent.isDirectory()) walk(p, fileName, out);
		else if (ent.name === fileName) out.push(p);
	}
}

function readText(path) {
	try {
		return readFileSync(path, 'utf8');
	} catch {
		return '';
	}
}

function exportsPrerender(content) {
	return PRERENDER_RE.test(content);
}

function exportsActions(content) {
	return ACTIONS_RE.test(content);
}

function ancestorLayoutPrerenders(filePath) {
	let dir = dirname(filePath);
	while (dir.startsWith(routesRoot) && dir.length >= routesRoot.length) {
		const layoutPath = join(dir, '+layout.server.ts');
		if (existsSync(layoutPath) && exportsPrerender(readText(layoutPath))) {
			return true;
		}
		if (dir === routesRoot) break;
		dir = dirname(dir);
	}
	return false;
}

const violations = [];

for (const fileName of ['+page.server.ts', '+layout.server.ts']) {
	const files = [];
	walk(routesRoot, fileName, files);
	for (const filePath of files) {
		const content = readText(filePath);
		const rel = relative(root, filePath);
		const hasPrerender = exportsPrerender(content);
		const hasActions = exportsActions(content);

		if (hasPrerender && hasActions) {
			violations.push(
				`${rel}: exports both prerender = true and actions (use a mirrored API POST instead)`
			);
		}

		if (fileName === '+page.server.ts' && hasActions) {
			if (ancestorLayoutPrerenders(filePath)) {
				violations.push(
					`${rel}: exports actions under a prerendered +layout.server.ts ancestor (use a mirrored API POST instead)`
				);
			}
		}
	}
}

if (violations.length > 0) {
	console.error('check-kit-prerender failed:\n');
	for (const v of violations) console.error(`  - ${v}`);
	process.exit(1);
}

console.log('check-kit-prerender: OK');
