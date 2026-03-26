/**
 * Prints SQL to baseline Drizzle's migration journal when the database already
 * contains the schema (e.g. created via db:push) but drizzle.__drizzle_migrations
 * is missing or empty — so `pnpm db:migrate` would fail on CREATE TABLE "account".
 *
 * Default: mark all journal entries except the **last** as applied, so the next
 * `pnpm db:migrate` only runs the latest migration file.
 *
 * Usage: pnpm db:baseline:sql
 *        pnpm db:baseline:sql -- --pending 2   # leave last 2 migrations to run
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parsePendingCount(argv) {
	const i = argv.indexOf('--pending');
	if (i === -1 || argv[i + 1] == null) return 1;
	const n = Number(argv[i + 1]);
	if (!Number.isInteger(n) || n < 1) {
		console.error('Invalid --pending N (need integer >= 1)');
		process.exit(1);
	}
	return n;
}

const pendingCount = parsePendingCount(process.argv);
const journal = JSON.parse(
	fs.readFileSync(
		path.join(root, 'drizzle/meta/_journal.json'),
		'utf8'
	)
);
const entries = journal.entries;
if (!Array.isArray(entries) || entries.length <= pendingCount) {
	console.error(
		`Journal needs more than ${pendingCount} entries (found ${entries?.length ?? 0})`
	);
	process.exit(1);
}

const applied = entries.slice(0, -pendingCount);
const pending = entries.slice(-pendingCount);

const maxWhen = Math.max(...applied.map((e) => e.when));
const markerEntry = applied.reduce((a, b) =>
	a.when >= b.when ? a : b
);

const sqlPath = path.join(root, 'drizzle', `${markerEntry.tag}.sql`);
const query = fs.readFileSync(sqlPath).toString();
const hash = crypto.createHash('sha256').update(query).digest('hex');

console.log(
	'-- Drizzle baseline SQL (schema: drizzle, table: __drizzle_migrations)'
);
console.log(
	`-- Marks migrations through "${markerEntry.tag}" (when=${maxWhen}) as applied.`
);
console.log('-- Next `pnpm db:migrate` will apply:');
for (const p of pending) {
	console.log(`--   ${p.tag} (when=${p.when})`);
}
console.log('');
console.log('CREATE SCHEMA IF NOT EXISTS drizzle;');
console.log(
	'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations ('
);
console.log('\tid SERIAL PRIMARY KEY,');
console.log('\thash text NOT NULL,');
console.log('\tcreated_at bigint');
console.log(');');
console.log(
	`INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES ('${hash}', ${maxWhen});`
);
