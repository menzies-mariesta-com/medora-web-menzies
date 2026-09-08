/**
 * Enforces: no static vertical tooltip placement in Svelte UI.
 * Horizontal left/right placement is resolved at runtime in WashTooltip.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = /\b(?:d-)?tooltip-(?:top|bottom)\b/;

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
	if (FORBIDDEN.test(text)) violations.push(filePath);
}

const srcFiles = [];
walk('src', srcFiles);

for (const f of srcFiles) {
	if (f.endsWith('.svelte')) scanFile(f);
}

if (violations.length > 0) {
	console.error(
		'check:tooltip-placement failed: remove tooltip-top / tooltip-bottom from Svelte files (use WashTooltip auto placement):\n'
	);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

console.log('check:tooltip-placement: ok');
