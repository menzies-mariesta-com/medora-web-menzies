import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/** Fixed UUID for seed staff so we can reference it in staff_hospital, staff_department, etc. */
// const SEED_STAFF_ID = '01900000-0000-7000-8000-000000000001';

/**
 * Seed information/business tables with sample data.
 * 
 * Run after master-table-seed. Inserts in FK-safe order.
 *
 * npx tsx src/lib/server/db/seed/information-table-seed.ts
 */
export async function seedInformationTables() {
	console.log('Seeding information tables...');

	// 1. Modules (depends: status)
	await db.execute(sql`
		INSERT INTO module (id, name, image_url, sequence_no, status_id)
		VALUES 
			(1, 'dashboard', 'layout-dashboard.svg', 1, 1),
			(2, 'patient', 'users.svg', 2, 1),
			(3, 'appointment', 'calendar.svg', 3, 1),
			(4, 'settings', 'settings.svg', 4, 1),
			(5, 'administration', 'administration.svg', 5, 1),
			(6, 'report', 'report.svg', 6, 1),
			(7, 'billing', 'billing.svg', 7, 1),
			(8, 'CPOE', 'cpoe.svg', 8, 1),
			(9, 'pharmacy', 'pharmacy.svg', 9, 1),
			(10, 'medical_record', 'medical-record.svg', 10, 1),
			(11, 'inventory', 'inventory.svg', 11, 1),
			(12, 'nursing', 'nursing.svg', 12, 1),
			(13, 'emergency', 'emergency.svg', 13, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: module');

	// 2. Modules (depends: status)
	await db.execute(sql`
		INSERT INTO user_group (id, name, status_id)
		VALUES 
			(1, 'administration',  1),
			(2, 'doctor',  1),
			(3, 'nursing',  1),
			(4, 'cashier',  1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: module');

	// 3. Departments
	await db.execute(sql`
		INSERT INTO department (id, name, code, status_id)
		VALUES 
			(1, 'emergency', 'em', 1),
			(2, 'cardiology', 'card', 1),
			(3, 'pediatrics', 'ped')
		ON CONFLICT (id) DO NOTHING;
		`);
	console.log('Seeded: department')

	// 4. Page
	await db.execute(sql`
		INSERT INTO page (id, name, icon, module_id)
		VALUES
			(1, 'registration', 5)
		ON CONFLICT (id) DO NOTHING;
		`)
	console.log('Seeded: page')

	// 5. Role
	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES
			(1, 'admin', 1),
			(2, 'doctor', 1),
			(3, 'nurse', 1),
			(4, 'receptionist', 1)
		ON CONFLICT (id) DO NOTHING;
		`)
	console.log('Seeded: role')
}

seedInformationTables()
	.then(() => {
		console.log('Seeding finished successfully.');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Error while seeding information tables:', error);
		process.exit(1);
	});
