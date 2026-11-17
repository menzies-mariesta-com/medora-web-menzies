#!/usr/bin/env node
/**
 * Run drizzle/*.sql files statement-by-statement (splits on --> statement-breakpoint).
 * Files without breakpoints are split on semicolons ending a line (skips empty).
 *
 *   node --env-file=.env scripts/run-sql-files.mjs drizzle/0067_owner_plan_lifecycle.sql
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
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

const files = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (files.length === 0) {
	console.error(
		'Pass at least one .sql path, e.g. drizzle/0067_owner_plan_lifecycle.sql'
	);
	process.exit(1);
}

function splitStatements(raw) {
	if (raw.includes('--> statement-breakpoint')) {
		return raw
			.split(/--> statement-breakpoint\n?/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return raw
		.split(/;\s*\n/)
		.map((s) => s.trim())
		.filter((s) => s && !s.startsWith('--'));
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
	for (const rel of files) {
		const path = isAbsolute(rel) ? rel : resolve(root, rel);
		if (!existsSync(path)) {
			console.error('File not found:', path);
			process.exit(1);
		}
		const raw = readFileSync(path, 'utf8');
		const statements = splitStatements(raw);
		console.log(`\n=== ${rel} (${statements.length} statements) ===`);
		for (const statement of statements) {
			const preview = statement.slice(0, 72).replace(/\s+/g, ' ');
			console.log('  ', preview, '...');
			try {
				await client.query(statement);
			} catch (err) {
				const code = err?.code;
				// Idempotent re-apply: constraint/index/table already exists
				if (code === '42710' || code === '42P07' || code === '23505') {
					console.warn('  (skipped, already applied:', code, ')');
					continue;
				}
				throw err;
			}
		}
	}
	console.log('\nDone.');
} finally {
	client.release();
	await pool.end();
}