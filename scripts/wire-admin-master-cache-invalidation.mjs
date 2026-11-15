/**
 * One-shot: insert notifyHospitalMasterWrite before returns in administration
 * create/update/delete exports. Safe to re-run (skips already wired files).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIRS = [
	'src/lib/server/medora/administration',
	'src/lib/server/medora/ipd',
	'src/lib/server/medora/inventory',
	'src/lib/server/medora/document-master',
	'src/lib/server/medora/er',
	'src/lib/server/medora/appointment',
	'src/lib/server/medora/medication-order'
].map((rel) => path.join(root, rel));

const IMPORT =
	"import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';\n";

function walk(dir) {
	const out = [];
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		const st = fs.statSync(p);
		if (st.isDirectory()) out.push(...walk(p));
		else if (name.endsWith('.server.ts')) out.push(p);
	}
	return out;
}

function wireFile(filePath) {
	let src = fs.readFileSync(filePath, 'utf8');
	if (!/export async function (create|update|delete)/.test(src)) return false;
	if (src.includes('notifyHospitalMasterWrite')) return false;

	const fnBlocks = [
		...src.matchAll(
			/export async function (create|update|delete)\w*\([^)]*\)[^{]*\{[\s\S]*?\n\}/g
		)
	];
	if (fnBlocks.length === 0) return false;

	let updated = src;
	for (const match of fnBlocks) {
		const block = match[0];
		if (block.includes('notifyHospitalMasterWrite')) continue;
		let hospitalExpr = 'hospitalId';
		if (block.includes('input.hospitalId')) hospitalExpr = 'input.hospitalId';
		else if (block.includes('input: {')) hospitalExpr = 'input.hospitalId';

		const patched = block.replace(
			/(\n)(\treturn )/g,
			`\n\tvoid notifyHospitalMasterWrite(${hospitalExpr});\n$1$2`
		);
		if (patched === block) continue;
		updated = updated.replace(block, patched);
	}

	const firstImportEnd = updated.indexOf('\n', updated.indexOf('import '));
	if (firstImportEnd === -1) return false;
	updated =
		updated.slice(0, firstImportEnd + 1) +
		IMPORT +
		updated.slice(firstImportEnd + 1);

	fs.writeFileSync(filePath, updated);
	return true;
}

let count = 0;
for (const dir of TARGET_DIRS) {
	if (!fs.existsSync(dir)) continue;
	const files = fs.statSync(dir).isDirectory()
		? walk(dir)
		: [dir];
	for (const file of files) {
		if (wireFile(file)) {
			count += 1;
			console.log('wired', path.relative(root, file));
		}
	}
}
console.log(`wired ${count} files`);