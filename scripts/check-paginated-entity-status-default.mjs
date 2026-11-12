/**
 * Ensures paginated entity list servers default to ACTIVE (via paginatedEntityStatusEq).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/lib/server/medora';

/** Basenames that expose paginated master lists with StatusEnum lifecycle. */
const TARGET_FILES = new Set([
	'staff.server.ts',
	'patient.server.ts',
	'hospital-department.server.ts',
	'user-group.server.ts',
	'category.server.ts',
	'sub-category.server.ts',
	'external-refer.server.ts',
	'supplier.server.ts',
	'pharmacy-generic.server.ts',
	'unit-master.server.ts',
	'item-unit-master.server.ts',
	'ward.server.ts',
	'room.server.ts',
	'bed.server.ts',
	'room-category.server.ts',
	'ward-category.server.ts',
	'hospital-branch.server.ts',
	'ed-triage-level.server.ts',
	'document-type.server.ts',
	'document-setting.server.ts',
	'document.server.ts',
	'service-tagging.server.ts',
	'admin-icd.server.ts',
	'admin-staff.server.ts'
]);

function walk(dir, out) {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		if (name.name === 'node_modules') continue;
		const p = join(dir, name.name);
		if (name.isDirectory()) walk(p, out);
		else if (name.name.endsWith('.server.ts')) out.push(p);
	}
}

const files = [];
walk(ROOT, files);

const violations = [];

for (const file of files) {
	const base = file.split('/').pop();
	if (!TARGET_FILES.has(base)) continue;
	const text = readFileSync(file, 'utf8');
	if (!text.includes('Paginated') && !text.includes('ListPaginated')) continue;
	if (!text.includes('paginatedEntityStatusEq')) {
		violations.push(file);
	}
}

if (violations.length > 0) {
	console.error(
		'check:paginated-entity-status-default failed — use paginatedEntityStatusEq in:\n'
	);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}

console.log('check:paginated-entity-status-default: ok');
