import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { CountryCodeData } from '../../../model/data/country-code.data.ts';
import { StringUtil } from '../../../util/string.util.svelte.ts';
import { seedLogger } from '$lib/logger';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/**
 * Seed master/lookup tables with basic reference data.
 *
 * This script is designed to be:
 * - **Order-aware** – inserts in FK‑safe order (status → country → state → city → others)
 * - **Idempotent-ish** – sets fixed primary keys so re-running will no-op on conflicts
 *
 * npx tsx src/lib/server/db/seed/master-table-seed.ts
 */
export async function seedAuthTables() {
	seedLogger.info('Seeding auth tables...');

	// 1. Role
	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES 
			(1, 'System Admin', 1),
			(2, 'Owner', 1),
			(3, 'Staff', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: role');
}

// Allow running via `ts-node` / `tsx` / `node` (after build)
seedAuthTables()
	.then(() => {
		seedLogger.info('Auth table seeding finished');
		process.exit(0);
	})
	.catch((error) => {
		seedLogger.error(
			'Error while seeding auth tables',
			error instanceof Error ? error : new Error(String(error))
		);
		process.exit(1);
	});
