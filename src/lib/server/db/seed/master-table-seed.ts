import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { CountryCodeData } from '../../../model/data/country-code.data.ts';
import { StringUtil } from '../../../util/string.util.svelte.ts';

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
export async function seedMasterTables() {
	console.log('Seeding master tables...');

	// 1. Statuses
	await db.execute(sql`
		INSERT INTO status (id, name)
		VALUES 
			(1, 'Active'),
			(2, 'Inactive'),
			(3, 'Pending'),
			(4, 'Deleted')
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: status');

	// 2. Countries
	await db.execute(sql`
		INSERT INTO country (id, name, code, img_url, country_calling_code, language, status_id)
		VALUES ${sql.join(
			CountryCodeData.map((c) =>
				// name: formatted with StringUtil.countryName
				// code: kept in lowercase as in source data
				sql`(${c.id}, ${StringUtil.countryName(c.name)}, ${c.code}, ${c.image}, ${c.phone}, ${c.language}, 1)`
			),
			sql`, `
		)}
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: country');

	// 3. States / Regions
	await db.execute(sql`
		INSERT INTO state (id, name, code, country_id, status_id)
		VALUES 
			(1, 'Yangon Region', 'YG', 118, 1),
			(2, 'Mandalay Region', 'MDY', 118, 1),
			(3, 'Naypyidaw Union Territory', 'NPT', 118, 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: state');

	// 4. Cities
	await db.execute(sql`
		INSERT INTO city (id, name, code, state_id, status_id)
		VALUES 
			(1, 'Yangon', 'YGN', 1, 1),
			(2, 'Mandalay', 'MDY', 2, 1),
			(3, 'Naypyidaw', 'NPT', 3, 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: city');

	// 5. Genders
	await db.execute(sql`
		INSERT INTO gender (id, name, status_id)
		VALUES 
			(1, 'Male', 1),
			(2, 'Female', 1),
			(3, 'Other', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: gender');

	// 6. Identity Types
	await db.execute(sql`
		INSERT INTO identity_type (id, name)
		VALUES 
			(1, 'NRC'),
			(2, 'Passport'),
			(3, 'Driving License')
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: identity_type');

	// 7. Marital / Marial Status
	await db.execute(sql`
		INSERT INTO marial_status (id, name)
		VALUES 
			(1, 'Single'),
			(2, 'Married'),
			(3, 'Divorced'),
			(4, 'Widowed')
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: marial_status');

	// 8. Specializations (for doctors / staff)
	await db.execute(sql`
		INSERT INTO specialization (id, name)
		VALUES 
			(1, 'General Practitioner'),
			(2, 'Cardiology'),
			(3, 'Neurology'),
			(4, 'Pediatrics'),
			(5, 'Orthopedics')
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: specialization');

	// 9. Blood Types
	await db.execute(sql`
		INSERT INTO blood_type (id, name, status_id)
		VALUES 
			(1, 'A+', 1),
			(2, 'A-', 1),
			(3, 'B+', 1),
			(4, 'B-', 1),
			(5, 'AB+', 1),
			(6, 'AB-', 1),
			(7, 'O+', 1),
			(8, 'O-', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: blood_type');

	console.log('Master tables seeding completed.');
}

// Allow running via `ts-node` / `tsx` / `node` (after build)
seedMasterTables()
	.then(() => {
		console.log('Seeding finished successfully.');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Error while seeding master tables:', error);
		process.exit(1);
	});
