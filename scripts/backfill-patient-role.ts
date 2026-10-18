/**
 * One-off: set role_id = PATIENT for users linked to an active patient row.
 * Run: npx tsx --env-file=.env scripts/backfill-patient-role.ts
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config as loadDotenv } from 'dotenv';
import { ensureDatabaseUrl } from '$lib/server/db/ensure-database-url';
import { RoleEnum } from '$lib/model/enum/db-link';

loadDotenv({ quiet: true });
const db = drizzle(neon(ensureDatabaseUrl()));

async function main() {
	const result = await db.execute(sql`
		UPDATE "user" u
		SET role_id = ${RoleEnum.PATIENT}, updated_at = now()
		FROM patient p
		WHERE p.user_id = u.id
		  AND p.status_id != 4
		  AND (u.role_id IS NULL OR u.role_id != ${RoleEnum.PATIENT})
	`);
	console.log('Backfill patient role rows updated:', result.rowCount ?? 'ok');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
