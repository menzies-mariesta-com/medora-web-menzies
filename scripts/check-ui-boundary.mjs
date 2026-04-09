/**
 * Enforces: no `$lib/server/**` imports in UI or client Svelte modules.
 * Server-only code belongs in `+server.ts`, `+page.server.ts`, `hooks.server.ts`, `$lib/server/**`, etc.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SERVER_IMPORT = /\$lib\/server\b/;

function walk(dir, out) {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		if (name.name === 'node_modules' || name.name === '.git') continue;
		const p = join(dir, name.name);
		if (name.isDirectory()) walk(p, out);
		else out.push(p);
	}
}

const violations = [];

function scanFile(filePath) {
	let text;
	try {
		text = readFileSync(filePath, 'utf8');
	} catch {
		return;
	}
	if (SERVER_IMPORT.test(text)) violations.push(filePath);
}

const srcFiles = [];
walk('src', srcFiles);

for (const f of srcFiles) {
	if (f.includes(`${join('src', 'lib', 'server')}`)) continue;
	if (f.endsWith('.svelte')) scanFile(f);
	if (f.endsWith('.svelte.ts')) scanFile(f);
}

const toolFiles = [];
const toolRoot = join('src', 'lib', 'tool');
try {
	walk(toolRoot, toolFiles);
} catch {
	// no tool dir
}
for (const f of toolFiles) {
	if (!f.endsWith('.ts')) continue;
	scanFile(f);
}

if (violations.length > 0) {
	console.error(
		'check:ui-boundary failed: `$lib/server` must not appear in UI or `src/lib/tool/**`:\n'
	);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

console.log('check:ui-boundary: ok');
