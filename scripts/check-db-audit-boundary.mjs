#!/usr/bin/env node
/**
 * Ensures app server code uses audited DB access patterns.
 * Seeds, scripts, and Better Auth may use exceptions documented in db/index.ts.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');

const ALLOW_UNAUDITED = new Set([
	path.join(src, 'lib/server/db/index.ts'),
	path.join(src, 'lib/server/medora/observation/observation-emr.server.ts')
]);

const ALLOW_RAW_DB_IMPORT = new Set([
	path.join(src, 'lib/auth/server.ts'),
	path.join(src, 'lib/server/db/index.ts')
]);

function walk(dir, out = []) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		const st = fs.statSync(p);
		if (st.isDirectory()) {
			if (name === 'seed') continue;
			walk(p, out);
		} else if (/\.(ts|js|mjs)$/.test(name)) {
			out.push(p);
		}
	}
	return out;
}

const files = walk(src);
const violations = [];

for (const file of files) {
	if (file.includes(`${path.sep}lib${path.sep}server${path.sep}db${path.sep}seed${path.sep}`)) {
		continue;
	}
	const text = fs.readFileSync(file, 'utf8');
	if (
		text.includes('ensureDbUnaudited') &&
		!ALLOW_UNAUDITED.has(file)
	) {
		violations.push(`${file}: uses ensureDbUnaudited()`);
	}
	if (
		/from ['"]\$lib\/server\/db['"]/.test(text) &&
		/import \{[^}]*\bdb\b/.test(text) &&
		!ALLOW_RAW_DB_IMPORT.has(file)
	) {
		violations.push(
			`${file}: import { db } — use ensureDb() for audited writes`
		);
	}
}

if (violations.length) {
	console.error(
		'check:db-audit-boundary failed:\n' + violations.map((v) => `  ${v}`).join('\n')
	);
	process.exit(1);
}

console.log('check:db-audit-boundary: ok');
