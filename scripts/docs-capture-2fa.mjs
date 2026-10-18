/**
 * Temporarily disable 2FA for SEED_ADMIN during docs capture; restore from backup after.
 * Requires DOCS_CAPTURE_ALLOW_2FA_TOGGLE=1 and --env-file=.env
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backupPath = join(root, 'scripts/.docs-capture-2fa-backup.json');

if (!process.env.DATABASE_URL?.trim()) {
	const envPath = resolve(root, '.env');
	if (existsSync(envPath)) loadEnvFile(envPath);
}
function ensureDatabaseUrl() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) throw new Error('DATABASE_URL is not set in .env');
	return url;
}

function requireToggle() {
	if (process.env.DOCS_CAPTURE_ALLOW_2FA_TOGGLE !== '1') {
		console.error(
			'Set DOCS_CAPTURE_ALLOW_2FA_TOGGLE=1 to run docs capture 2FA disable/restore.'
		);
		process.exit(1);
	}
}

function rowsOf(result) {
	const r = result;
	return Array.isArray(r?.rows) ? r.rows : [];
}

const action = process.argv[2];
if (!action || !['disable', 'restore', 'status'].includes(action)) {
	console.error('Usage: node scripts/docs-capture-2fa.mjs disable|restore|status');
	process.exit(1);
}

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
if (!email && action !== 'status') {
	console.error('SEED_ADMIN_EMAIL is required in .env');
	process.exit(1);
}

const client = neon(ensureDatabaseUrl());
const db = drizzle(client);

if (action === 'status') {
	if (!existsSync(backupPath)) {
		console.log('docs-capture-2fa: no backup file');
		process.exit(0);
	}
	const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
	console.log(`docs-capture-2fa: backup present for ${backup.email}`);
	process.exit(0);
}

requireToggle();

if (action === 'disable') {
	if (existsSync(backupPath)) {
		console.error('Backup already exists. Run restore first or delete scripts/.docs-capture-2fa-backup.json');
		process.exit(1);
	}
	const users = rowsOf(
		await db.execute(sql`
			SELECT id, two_factor_enabled FROM "user" WHERE lower(email) = ${email} LIMIT 1
		`)
	);
	const user = users[0];
	if (!user?.id) {
		console.error(`No user found for ${email}`);
		process.exit(1);
	}
	const factors = rowsOf(
		await db.execute(sql`
			SELECT id, user_id, secret, backup_codes FROM two_factor WHERE user_id = ${user.id}
		`)
	);
	const backup = {
		email,
		userId: user.id,
		twoFactorEnabled: Boolean(user.two_factor_enabled),
		factors
	};
	writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
	await db.execute(sql`
		UPDATE "user" SET two_factor_enabled = false, updated_at = now() WHERE id = ${user.id}
	`);
	await db.execute(sql`DELETE FROM two_factor WHERE user_id = ${user.id}`);
	console.log(`docs-capture-2fa: disabled 2FA for ${email} (backup written)`);
}

if (action === 'restore') {
	if (!existsSync(backupPath)) {
		console.error('No backup file to restore.');
		process.exit(1);
	}
	const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
	await db.execute(sql`
		UPDATE "user"
		SET two_factor_enabled = ${backup.twoFactorEnabled}, updated_at = now()
		WHERE id = ${backup.userId}
	`);
	await db.execute(sql`DELETE FROM two_factor WHERE user_id = ${backup.userId}`);
	for (const row of backup.factors ?? []) {
		await db.execute(sql`
			INSERT INTO two_factor (id, user_id, secret, backup_codes, created_at, updated_at)
			VALUES (
				${row.id},
				${row.user_id},
				${row.secret},
				${row.backup_codes},
				now(),
				now()
			)
			ON CONFLICT (id) DO UPDATE SET
				secret = EXCLUDED.secret,
				backup_codes = EXCLUDED.backup_codes,
				updated_at = now()
		`);
	}
	unlinkSync(backupPath);
	console.log(`docs-capture-2fa: restored 2FA for ${backup.email}`);
}
