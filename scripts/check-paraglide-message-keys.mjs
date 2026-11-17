/**
 * Every `m.key()` / `msg.key()` call must name a message Paraglide actually
 * compiled. A typo or a camelCase key (`inv_po_approve_need_poId` compiles to
 * `..._poid1`) makes the call `undefined` at runtime, which throws
 * "m.x is not a function" *during* render and wedges SvelteKit navigation.
 *
 * Run: node scripts/check-paraglide-message-keys.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const compiledPath = join(root, 'src/lib/paraglide/messages/_index.js');

const compiled = readFileSync(compiledPath, 'utf8');
const keys = new Set(
	[...compiled.matchAll(/^export const ([A-Za-z0-9_$]+) =/gm)].map((m) => m[1])
);

const SKIP_DIRS = new Set(['node_modules', 'paraglide', '.svelte-kit', 'build']);
const IMPORT_RE = /from ['"]\$lib\/paraglide\/messages['"]/;

function walk(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (/\.(svelte|ts|js)$/.test(entry.name)) out.push(full);
	}
	return out;
}

const problems = [];
for (const file of walk(join(root, 'src'))) {
	const source = readFileSync(file, 'utf8');
	if (!IMPORT_RE.test(source)) continue;
	// `const msg = m as ...` is the documented alias for keys the TS build lags on;
	// both names can appear in the same file, so check each.
	// The lookbehind skips regex literals ending in the `m` flag (`/\n/m.test(x)`).
	const callRe = /(?<![\w.$/])(m|msg)\.([A-Za-z0-9_]+)\s*\(/g;
	for (const match of source.matchAll(callRe)) {
		if (!keys.has(match[2])) {
			problems.push(`${relative(root, file)}: ${match[1]}.${match[2]}()`);
		}
	}
}

if (problems.length > 0) {
	console.error(
		`check:paraglide-keys failed: ${problems.length} call(s) name a message that was never compiled:`
	);
	for (const problem of problems.slice(0, 40)) console.error(`  ${problem}`);
	console.error("Run: npm run paraglide (and check the key's spelling/case)");
	process.exit(1);
}

console.log(`check:paraglide-keys ok (${keys.size} messages)`);
