#!/usr/bin/env node
/**
 * Wipe `public` + `drizzle` schemas and run every migration from 0000 via drizzle-kit.
 * **Destroys all data.** Dev / throwaway Neon branches only.
 *
 *   ALLOW_DB_DESTROY=1 pnpm run db:reset:migrate
 *   ALLOW_DB_DESTROY=1 pnpm run db:reset:migrate -- --seed   # also pnpm db:seed
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const url = process.env.DATABASE_URL?.trim();
if (!url) {
	console.error('DATABASE_URL is not set (use --env-file=.env)');
	process.exit(1);
}
if (process.env.ALLOW_DB_DESTROY !== '1') {
	console.error(
		'Refusing to wipe DB. Set ALLOW_DB_DESTROY=1 to confirm.'
	);
	process.exit(1);
}

const withSeed = process.argv.includes('--seed');

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
	console.log('Dropping schemas drizzle + public (all data lost)...');
	await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
	await client.query('DROP SCHEMA IF EXISTS public CASCADE');
	await client.query('CREATE SCHEMA public');
	await client.query('GRANT ALL ON SCHEMA public TO PUBLIC');
	await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
	await client.query('CREATE SCHEMA drizzle');
	console.log('Schemas reset.');
} finally {
	client.release();
	await pool.end();
}

console.log('Running drizzle-kit migrate (all journal files)...');
const migrate = spawnSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
	cwd: root,
	stdio: 'inherit',
	env: process.env
});
if (migrate.status !== 0) {
	process.exit(migrate.status ?? 1);
}

if (withSeed) {
	console.log('Seeding init data...');
	const seed = spawnSync('pnpm', ['run', 'db:seed'], {
		cwd: root,
		stdio: 'inherit',
		env: process.env
	});
	if (seed.status !== 0) {
		process.exit(seed.status ?? 1);
	}
}

console.log('Done. Create hospital / admin in the app if this is a new environment.');