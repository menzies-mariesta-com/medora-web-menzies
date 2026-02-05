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
		INSERT INTO module (id, name, image_url, sequence_no, status_id, module_url)
		VALUES 
			(1, 'Dashboard', 'layout-dashboard.svg', 1, 1, 'heka/home/dashboard'),
			(2, 'Patient', 'users.svg', 2, 1, 'heka/home/patient'),
			(3, 'Appointment', 'calendar.svg', 3, 1, 'heka/home/appointment'),
			(4, 'Settings', 'settings.svg', 4, 1, 'heka/home/settings'),
			(5, 'Administration', 'administration.svg', 5, 1, 'heka/home/administration'),
			(6, 'Report', 'report.svg', 6, 1, 'heka/home/report'),
			(7, 'Billing', 'billing.svg', 7, 1, 'heka/home/billing'),
			(8, 'CPOE', 'cpoe.svg', 8, 1, 'heka/home/cpoe'),
			(9, 'Pharmacy', 'pharmacy.svg', 9, 1, 'heka/home/pharmacy'),
			(10, 'Medical Record', 'medical-record.svg', 10, 1, 'heka/home/medical-record'),
			(11, 'Inventory', 'inventory.svg', 11, 1, 'heka/home/inventory'),
			(12, 'Nursing', 'nursing.svg', 12, 1, 'heka/home/nursing'),
			(13, 'Emergency', 'emergency.svg', 13, 1, 'heka/home/emergency')
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
		INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
		VALUES
			(1, 'Audit Trail(EMR)', 5, 1, null, 'heka/home/administration/audit-trail', 1),
			(2, 'Payer Info', 5, 1, null, 'heka/home/administration/payer-info', 2),
			(3, 'Master Setup', 5, 1, null, 'heka/home/administration/master-setup', 3),
			(4, 'Employee Profile', 5, 1, null, 'heka/home/administration/employee-profile', 4),
			(5, 'Facility Tagging', 5, 1, null, 'heka/home/administration/facility-tagging', 5),
			(6, 'Corporate Master', 5, 1, null, 'heka/home/administration/corporate-master', 6),
			(7, 'Color Legends', 5, 1, null, 'heka/home/administration/color-legends', 7),
			(8, 'Roles and Permissions', 5, 1, null, 'heka/home/administration/roles-and-permissions', 8),
			(9, 'Holidays', 5, 1, null, 'heka/home/administration/holidays', 9),
			(10, 'Change Password', 5, 1, null, 'heka/home/administration/change-password', 10),
			(11, 'Visit Type', 5, 1, null, 'heka/home/administration/visit-type', 11),
			(12, 'Company Wise Editable Service Setup', 5, 1, null, 'heka/home/administration/company-wise-editable-service-setup', 12),
			(13, 'Currency Master', 5, 1, null, 'heka/home/administration/currency-master', 13),
			(14, 'Merge Patient Details', 5, 1, null, 'heka/home/administration/merge-patient-details', 14),
			(15, 'Payer', 5, 1, 2, 'heka/home/administration/payer', 15),
			(16, 'Insurance Category', 5, 1, 2, 'heka/home/administration/payer-info/insurance-category', 16),
			(17, 'Network', 5, 1, 2, 'heka/home/administration/payer-info/network', 17),
			(18, 'Network Details', 5, 1, 2, 'heka/home/administration/payer-info/network-details', 18),
			(19, 'Pricing Cash', 5, 1, 2, 'heka/home/administration/payer-info/pricing-cash', 19),
			(20, 'Pricing Credit', 5, 1, 2, 'heka/home/administration/payer-info/pricing-credit', 20),
			(21, 'Staff Registration', 5, 1, null, 'heka/home/administration/staff-registration', 21)
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