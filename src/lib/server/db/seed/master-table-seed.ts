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
			(1, 'active'),
			(2, 'inactive'),
			(3, 'pending'),
			(4, 'deleted')
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: status');

	// 2. Countries
	await db.execute(sql`
		INSERT INTO country (id, name, code, image_url, country_calling_code, language, status_id)
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

	// 10. Craft Groups
	await db.execute(sql`
		INSERT INTO craft_group (id, name, status_id)
		VALUES
			(1, 'GP', 1),
			(2, 'Admin', 1),
			(3, 'Aesthetic Clinic', 1),
			(4, 'Anaesthesia', 1),
			(5, 'Anaesthesiology', 1),
			(6, 'Behavior Science', 1),
			(7, 'Behavioural Health Sciences', 1),
			(8, 'Cardio', 1),
			(9, 'Dental', 1),
			(10, 'Emergency', 1),
			(11, 'Endoscopy', 1),
			(12, 'ENT', 1),
			(13, 'Gastroenterologist', 1),
			(14, 'General Surgery', 1),
			(15, 'Haemodialysis Center', 1),
			(16, 'Hepatology', 1),
			(17, 'Information Technology', 1),
			(18, 'Internal Medicine', 1),
			(19, 'Laboratory', 1),
			(20, 'Maxilofacial Clinic', 1),
			(21, 'Medical Record', 1),
			(22, 'Nephrology', 1),
			(23, 'Neuro-Science', 1),
			(24, 'Neurosurgery', 1),
			(25, 'Obstetrics & Gynaecology', 1),
			(26, 'Oncology', 1),
			(27, 'Opthalmology', 1),
			(28, 'Orthopaedics', 1),
			(29, 'Paediatrics', 1),
			(30, 'Paediatrics Cardiology', 1),
			(31, 'Pathology & Microbiology', 1),
			(32, 'Physical Therapy and Rehabilitation', 1),
			(33, 'Plastic Sugery', 1),
			(34, 'Plastic, Reconstructive and Asthetic Surgery', 1),
			(35, 'Pulmonology', 1),
			(36, 'Radiology', 1),
			(37, 'Rehabilitation Medicine', 1),
			(38, 'Speech Language Pathology', 1),
			(39, 'Urology', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: craft_group');

	// 11. Staff Types
	await db.execute(sql`
		INSERT INTO staff_type (id, name, code, status_id)
		VALUES
			(1, 'Full Time', 'FULL_TIME', 1),
			(2, 'Part Time', 'PART_TIME', 1),
			(3, 'Contract', 'CONTRACT', 1),
			(4, 'Locum', 'LOCUM', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: staff_type');

	// 12. Titles
	await db.execute(sql`
		INSERT INTO title (id, name, status_id)
		VALUES
			(1, 'Dr.', 1),
			(2, 'Mr', 1),
			(3, 'Mrs.', 1),
			(4, 'Ms.', 1),
			(5, 'Baby', 1),
			(6, 'Prof.', 1),
			(7, 'Asst. Prof.', 1),
			(8, 'Daw', 1),
			(9, 'Ko', 1),
			(10, 'Ma', 1),
			(11, 'Mg', 1),
			(12, 'U', 1),
			(13, 'Prof. Dr.', 1),
			(14, 'Asso. Prof', 1),
			(15, 'RN.', 1),
			(16, 'Prof. Col', 1),
			(17, 'MW', 1),
			(18, 'Rector Prof', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('Seeded: title');
	
	// 13. Departments
	await db.execute(sql`
		INSERT INTO department (id, name, code, status_id)
		VALUES 
			(1, 'Emergency', 'em', 1),
			(2, 'Cardiology', 'card', 1),
			(3, 'Pediatrics', 'ped', 1)
		ON CONFLICT (id) DO NOTHING;
		`);
	console.log('Seeded: department')

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
