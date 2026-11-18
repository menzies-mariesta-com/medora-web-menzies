import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import argon2 from 'argon2';
import { uuidV7 } from '$lib/util/id.util';
import { config as loadDotenv } from 'dotenv';
import { seedLogger } from '$lib/logger';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';

// Seed runs via tsx (outside SvelteKit); load .env so SEED_ADMIN_* apply.
// ensureDatabaseUrl also loads .env when DATABASE_URL is missing.
loadDotenv({ quiet: true });

const client = neon(ensureDatabaseUrl());
const db = drizzle(client);

async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, {
		type: argon2.argon2id,
		memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 64 * 1024),
		timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
		parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
		hashLength: Number(process.env.ARGON2_HASH_LENGTH ?? 32)
	});
}

type QueryRows<T> = { rows: T[] };

function rowsOf<T>(result: unknown): T[] {
	const r = result as QueryRows<T>;
	return Array.isArray(r?.rows) ? r.rows : [];
}

/**
 * Seed auth roles + optional SYSTEM_ADMIN from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Insert-only: re-run skips admin if email already exists.
 */
export async function seedAuthTables() {
	seedLogger.info('Seeding auth tables...');

	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES 
			(1, 'System Admin', 1),
			(2, 'Owner', 1),
			(3, 'Staff', 1),
			(4, 'Admin Team', 1),
			(5, 'Patient', 1)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			status_id = EXCLUDED.status_id;
	`);
	seedLogger.info('Seeded: role');

	const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.SEED_ADMIN_PASSWORD?.trim();

	if (!email || !password) {
		seedLogger.info(
			'Skipping SYSTEM_ADMIN user seed (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)'
		);
		return;
	}

	const hashedPassword = await hashPassword(password);
	const userId = uuidV7();
	const accountId = uuidV7();
	const inserted = rowsOf<{ id: string }>(
		await db.execute(sql`
			INSERT INTO "user" (
				id, name, email, email_verified, role_id, two_factor_enabled, created_at, updated_at
			) VALUES (
				${userId}, 'System Admin', ${email}, true, 1, false, now(), now()
			)
			ON CONFLICT (email) DO NOTHING
			RETURNING id
		`)
	);
	if (inserted.length === 0) {
		seedLogger.info(
			`SYSTEM_ADMIN ${email} already exists; skipping account (insert-only seed)`
		);
		return;
	}

	await db.execute(sql`
		INSERT INTO account (
			id, user_id, account_id, provider_id, password, created_at, updated_at
		) VALUES (
			${accountId}, ${inserted[0].id}, ${email}, 'credential', ${hashedPassword}, now(), now()
		)
	`);
	seedLogger.info(`Created SYSTEM_ADMIN user: ${email}`);
}

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