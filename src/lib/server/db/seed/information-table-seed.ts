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
			(1, 'Dashboard', 'layout-dashboard.svg', 1, 1),
			(2, 'Patient', 'users.svg', 2, 1),
			(3, 'Appointment', 'calendar.svg', 3, 1),
			(4, 'Settings', 'settings.svg', 4, 1),
			(5, 'Administration', 'administration.svg', 5, 1),
			(6, 'Report', 'report.svg', 6, 1),
			(7, 'Billing', 'billing.svg', 7, 1),
			(8, 'CPOE', 'cpoe.svg', 8, 1),
			(9, 'Pharmacy', 'pharmacy.svg', 9, 1),
			(10, 'Medical Record', 'medical-record.svg', 10, 1),
			(11, 'Inventory', 'inventory.svg', 11, 1),
			(12, 'Nursing', 'nursing.svg', 12, 1),
			(13, 'Emergency', 'emergency.svg', 13, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: module');

	// 2. Hospital (depends: status)
	await db.execute(sql`
		INSERT INTO hospital (id, name, code, city_id, state_id, country_id, status_id)
		VALUES 
			(1, 'Mari', 'mr', 1, 1, 118, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: user_group');

	// 2. User Groups (depends: status)
	await db.execute(sql`
		INSERT INTO user_group (id, name, status_id, hospital_id)
		VALUES 
			(1, 'Administration',  1, 1),
			(2, 'Doctor',  1, 1),
			(3, 'Nursing',  1, 1),
			(4, 'Cashier',  1, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: user_group');

	// 4. Page (depends: module, status)
	await db.execute(sql`
		INSERT INTO page (id, name, module_id, status_id, parent_id)
		VALUES
			(1, 'Audit Trail(EMR)', 5, 1, null),
			(2, 'Payer Info', 5, 1, null),
			(3, 'Master Setup', 5, 1, null),
			(4, 'Employee Profile', 5, 1, null),
			(5, 'Facility Tagging', 5, 1, null),
			(6, 'Corporate Master', 5, 1, null),
			(7, 'Color Legends', 5, 1, null),
			(8, 'Roles and Permissions', 5, 1, null),
			(9, 'Holidays', 5, 1, null),
			(10, 'Change Password', 5, 1, null),
			(11, 'Visit Type', 5, 1, null),
			(12, 'Company Wise Editable Service Setup', 5, 1, null),
			(13, 'Currency Master', 5, 1, null),
			(14, 'Merge Patient Details', 5, 1, null),
			(15, 'Payer', 5, 1, 2),
			(16, 'Insurance Category', 5, 1, 2),
			(17, 'Network', 5, 1, 2),
			(18, 'Network Details', 5, 1, 2),
			(19, 'Pricing Cash', 5, 1, 2),
			(20, 'Pricing Credit', 5, 1, 2)
		ON CONFLICT (id) DO NOTHING;
		`)
	console.log('Seeded: page')

	// 5. Role
	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES
			(1, 'Admin', 1),
			(2, 'Doctor', 1),
			(3, 'Nurse', 1),
			(4, 'Receptionist', 1)
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