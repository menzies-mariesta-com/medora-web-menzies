#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dotted = /\{\{[a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+\}\}/g;

const dirs = [
	path.join(root, 'src/lib/server/db/seed'),
	path.join(root, 'src/lib/server/medora/document-master/catalog'),
	path.join(root, 'src/lib/util/clinical-form-print-body.util.ts')
];

const files = [];
function walk(p) {
	if (!fs.existsSync(p)) return;
	const st = fs.statSync(p);
	if (st.isFile() && /\.(ts|sql|svelte)$/.test(p)) files.push(p);
	else if (st.isDirectory()) {
		for (const name of fs.readdirSync(p)) walk(path.join(p, name));
	}
}
for (const d of dirs) walk(d);

let failed = false;
for (const f of files) {
	const text = fs.readFileSync(f, 'utf8');
	const hits = text.match(dotted);
	if (hits?.length) {
		failed = true;
		console.error(`${path.relative(root, f)}: dotted placeholders ${[...new Set(hits)].join(', ')}`);
	}
}

if (failed) process.exit(1);
console.log('verify-document-placeholders: ok');
