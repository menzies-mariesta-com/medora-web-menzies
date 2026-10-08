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
 * Idempotent: roles upsert by id; admin upserts by email.
 */
export async function seedAuthTables() {
	seedLogger.info('Seeding auth tables...');

	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES 
			(1, 'System Admin', 1),
			(2, 'Owner', 1),
			(3, 'Staff', 1),
			(4, 'Admin Team', 1)
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
	const existingRows = rowsOf<{ id: string }>(
		await db.execute(sql`
			SELECT id FROM "user" WHERE lower(email) = ${email} LIMIT 1
		`)
	);
	let userId = existingRows[0]?.id;

	if (userId) {
		await db.execute(sql`
			UPDATE "user"
			SET
				name = 'System Admin',
				email = ${email},
				email_verified = true,
				role_id = 1,
				updated_at = now()
			WHERE id = ${userId}
		`);
		await db.execute(sql`
			UPDATE account
			SET
				password = ${hashedPassword},
				account_id = ${email},
				updated_at = now()
			WHERE user_id = ${userId} AND provider_id = 'credential'
		`);
		const accounts = rowsOf<{ id: string }>(
			await db.execute(sql`
				SELECT id FROM account
				WHERE user_id = ${userId} AND provider_id = 'credential'
				LIMIT 1
			`)
		);
		if (accounts.length === 0) {
			const accountId = uuidV7();
			await db.execute(sql`
				INSERT INTO account (
					id, user_id, account_id, provider_id, password, created_at, updated_at
				) VALUES (
					${accountId}, ${userId}, ${email}, 'credential', ${hashedPassword}, now(), now()
				)
			`);
		}
		seedLogger.info(`Updated SYSTEM_ADMIN user: ${email}`);
	} else {
		userId = uuidV7();
		const accountId = uuidV7();
		await db.execute(sql`
			INSERT INTO "user" (
				id, name, email, email_verified, role_id, two_factor_enabled, created_at, updated_at
			) VALUES (
				${userId}, 'System Admin', ${email}, true, 1, false, now(), now()
			)
		`);
		await db.execute(sql`
			INSERT INTO account (
				id, user_id, account_id, provider_id, password, created_at, updated_at
			) VALUES (
				${accountId}, ${userId}, ${email}, 'credential', ${hashedPassword}, now(), now()
			)
		`);
		seedLogger.info(`Created SYSTEM_ADMIN user: ${email}`);
	}
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
