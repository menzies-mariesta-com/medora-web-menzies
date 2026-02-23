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
		INSERT INTO module (id, name, sequence_no, status_id, module_url, image_url)
		VALUES 
			(1, 'Administration', 1, 1, '/heka/home/administration', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-star-icon lucide-user-star"><path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/><path d="M8 15H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/></svg>'),
			(2, 'Registration', 2, 1, '/heka/home/registration', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-round-icon lucide-users-round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>'),
			(3, 'Appointment', 2, 1, '/heka/home/appointment', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-clock-icon lucide-clipboard-clock"><path d="M16 14v2.2l1.6 1"/><path d="M16 4h2a2 2 0 0 1 2 2v.832"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/><circle cx="16" cy="16" r="6"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>')
			
			-- (1, 'Dashboard', 'layout-dashboard.svg', 1, 1, '/heka/home/dashboard'),
			-- (3, 'Appointment', 'calendar.svg', 3, 1, '/heka/home/appointment'),
			-- (4, 'Settings', 'settings.svg', 4, 1, '/heka/home/settings'),
			-- (6, 'Report', 'report.svg', 6, 1, '/heka/home/report'),
			-- (7, 'Billing', 'billing.svg', 7, 1, '/heka/home/billing'),
			-- (8, 'CPOE', 'cpoe.svg', 8, 1, '/heka/home/cpoe'),
			-- (9, 'Pharmacy', 'pharmacy.svg', 9, 1, '/heka/home/pharmacy'),
			-- (10, 'Medical Record', 'medical-record.svg', 10, 1, '/heka/home/medical-record'),
			-- (11, 'Inventory', 'inventory.svg', 11, 1, '/heka/home/inventory'),
			-- (12, 'Nursing', 'nursing.svg', 12, 1, '/heka/home/nursing'),
			-- (13, 'Emergency', 'emergency.svg', 13, 1, '/heka/home/emergency')
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: module');

	// 2. Hospital (depends: status). id is UUID.
	await db.execute(sql`
		INSERT INTO hospital (id, name, code, city_id, state_id, country_id, status_id)
		VALUES 
			('01900000-0000-7000-8000-000000000001'::uuid, 'Pun Hlaing Hospitals', 'phh', 1, 1, 118, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: hospital');

	// 2b. Hospital patient code counter (one row per hospital, start at 0 so first code is 1)
	await db.execute(sql`
		INSERT INTO hospital_patient_code_counter (hospital_id, last_number)
		SELECT id, 0 FROM hospital
		ON CONFLICT (hospital_id) DO NOTHING;
	`);
	console.log('Seeded: hospital_patient_code_counter');

	// 3. Page (depends: module, status)
	await db.execute(sql`
		INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
		VALUES
			-- Parent Page Id (1 -> 100000)
			-- Child Page Id (1 -> 100001)
			-- Child Page Id (1 -> 100002)
			-- Parent Page Id (2 -> 200000)
			-- Child Page Id (2 -> 200001)

			-- Administration Module
			-- staff pages
			(1, 'Staff', 1, 1, null, '/heka/home/administration/staff', 1),
			(100001, 'Staff Registration', 1, 1, 1, '/heka/home/administration/staff/registration', 1),
			(100002, 'Staff List', 1, 1, 1, '/heka/home/administration/staff/list', 2),

			-- schedule
			(3, 'Schedule', 1, 1, null, '/heka/home/administration/schedule', 1),
			(300001, 'Doctor Schedule', 1, 1, 3, '/heka/home/administration/schedule/doctor-schedule', 1),

			-- external refer master
			(5, 'External Refer Master', 1, 1, null, '/heka/home/administration/external-refer-master', 1),

			-- user group (per-hospital management)
			(6, 'User Group', 1, 1, null, '/heka/home/administration/user-group', 4),

			-- Registration Module
			-- patient pages
			(2, 'Patient', 2, 1, null, '/heka/home/registration/patient', 1),
			(200001, 'Patient Registration', 2, 1, 2, '/heka/home/registration/patient/registration', 1),
			(200002, 'Patient List', 2, 1, 2, '/heka/home/registration/patient/list', 2),

			-- Administration Module

			-- Appointment Module
			-- doctor appointments
			(4, 'Doctor Appointment', 3, 1, null, '/heka/home/appointment/doctor-appointment', 1)


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

	// 6. Status Tagging Type
	await db.execute(sql`
		INSERT INTO status_tagging_type (id, name)
		VALUES
			(1, 'Doctor Appointment')
		ON CONFLICT (id) DO NOTHING;
		`)
	console.log('Seeded: status tagging type')


	// 7. status_tagging
	await db.execute(sql`
		INSERT INTO status_tagging (id, name, code, sequence_no, status_tagging_type_id)
		VALUES 

			-- Doctor Appointment Status
			(1, 'Unconfirmed', 'unconfirmed', 1, 1),
			(2, 'Confirmed', 'confirmed', 2, 1),
			(3, 'Check In', 'check_in', 3, 1)

		ON CONFLICT (id) DO NOTHING;
		`)
	console.log('Seeded: status tagging')

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