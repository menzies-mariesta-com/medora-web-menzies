import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/** Fixed UUID for seed staff so we can reference it in staff_hospital, staff_department, etc. */
const SEED_STAFF_ID = '01900000-0000-7000-8000-000000000001';

/**
 * Seed information/business tables with sample data.
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
			(2, 'Patients', 'users.svg', 2, 1),
			(3, 'Appointments', 'calendar.svg', 3, 1),
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

	// 2. Modules (depends: status)
	await db.execute(sql`
		INSERT INTO user_group (id, name, status_id)
		VALUES 
			(1, 'Administrators',  1),
			(2, 'Doctors',  1),
			(3, 'Nursing',  1),
			(4, 'Cashier',  1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: module');
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
