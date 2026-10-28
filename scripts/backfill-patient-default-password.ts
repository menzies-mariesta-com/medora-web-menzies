/**
 * Set credential password to patient.code and must_change_password=true for PATIENT users.
 * Run after migration 0030: npx tsx --env-file=.env scripts/backfill-patient-default-password.ts
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config as loadDotenv } from 'dotenv';
import argon2 from 'argon2';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import { RoleEnum } from '$lib/model/enum/db-link';

loadDotenv({ quiet: true });
const db = drizzle(neon(ensureDatabaseUrl()));

async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, { type: argon2.argon2id });
}

async function main() {
	const rows = await db.execute(sql`
		SELECT u.id AS user_id, p.code AS patient_code
		FROM "user" u
		INNER JOIN patient p ON p.user_id = u.id
		WHERE u.role_id = ${RoleEnum.PATIENT}
		  AND p.status_id != 4
		  AND p.code IS NOT NULL
		  AND trim(p.code) <> ''
	`);
	const list = (rows as { rows: { user_id: string; patient_code: string }[] })
		.rows;
	let updated = 0;
	for (const row of list) {
		const hash = await hashPassword(row.patient_code);
		await db.execute(sql`
			UPDATE account
			SET password = ${hash}, updated_at = now()
			WHERE user_id = ${row.user_id} AND provider_id = 'credential'
		`);
		await db.execute(sql`
			UPDATE "user"
			SET must_change_password = true, updated_at = now()
			WHERE id = ${row.user_id}
		`);
		updated++;
	}
	console.log(`Updated ${updated} patient account(s) to default password = patient code.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
