#!/usr/bin/env node
/**
 * Idempotent apply of drizzle/0067_owner_plan_lifecycle.sql when the journal
 * row exists but tables were never created (baseline / failed partial run).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const raw = readFileSync(
	join(root, 'drizzle/0067_owner_plan_lifecycle.sql'),
	'utf8'
);
const statements = raw
	.split(/--> statement-breakpoint\n?/)
	.map((s) => s.trim())
	.filter(Boolean);

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
	for (const statement of statements) {
		console.log(
			'Executing:',
			statement.slice(0, 60).replace(/\s+/g, ' '),
			'...'
		);
		await client.query(statement);
	}

	const check = await client.query(`
		SELECT tablename FROM pg_tables
		WHERE schemaname = 'public'
		  AND tablename IN ('owner_entitlement', 'plan_request', 'trial_otp')
	`);
	console.log(
		'Tables now present:',
		check.rows.map((r) => r.tablename).join(', ')
	);
} finally {
	client.release();
	await pool.end();
}
