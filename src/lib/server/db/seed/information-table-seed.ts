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

	// 1. Hospitals (depends: status)
	await db.execute(sql`
		INSERT INTO hospital (id, name, code, status_id)
		VALUES 
			(1, 'Yangon General Hospital', 'YGH', 1),
			(2, 'Mandalay General Hospital', 'MGH', 1),
			(3, 'Naypyidaw Medical Center', 'NMC', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: hospital');

	// 2. Departments (depends: hospital, status)
	await db.execute(sql`
		INSERT INTO department (id, name, code, hospital_id, status_id)
		VALUES 
			(1, 'Emergency', 'EM', 1, 1),
			(2, 'Outpatient', 'OPD', 1, 1),
			(3, 'Cardiology', 'CARD', 1, 1),
			(4, 'Pediatrics', 'PED', 1, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: department');

	// 3. Modules (depends: status)
	await db.execute(sql`
		INSERT INTO module (id, name, icon, status_id)
		VALUES 
			(1, 'Dashboard', 'layout-dashboard', 1),
			(2, 'Patients', 'users', 1),
			(3, 'Appointments', 'calendar', 1),
			(4, 'Settings', 'settings', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: module');

	// 4. Pages (depends: module, status)
	await db.execute(sql`
		INSERT INTO page (id, name, icon, module_id, status_id)
		VALUES 
			(1, 'Overview', 'bar-chart', 1, 1),
			(2, 'Patient List', 'list', 2, 1),
			(3, 'New Patient', 'user-plus', 2, 1),
			(4, 'Appointment List', 'calendar-days', 3, 1),
			(5, 'Profile', 'user', 4, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: page');

	// 5. Roles (depends: status)
	await db.execute(sql`
		INSERT INTO role (id, name, status_id)
		VALUES 
			(1, 'Admin', 1),
			(2, 'Doctor', 1),
			(3, 'Nurse', 1),
			(4, 'Receptionist', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: role');

	// 6. User groups (depends: status)
	await db.execute(sql`
		INSERT INTO user_group (id, name, status_id)
		VALUES 
			(1, 'Administrators', 1),
			(2, 'Doctors', 1),
			(3, 'Nursing', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: user_group');

	// 7. Staff (depends: identity_type, marial_status, specialization, gender, blood_type, status)
	await db.execute(sql`
		INSERT INTO staff (
			id, first_name, last_name, email, phone_primary,
			identity_type_id, marital_status_id, specialization_id, gender_id, blood_type_id, status_id
		)
		VALUES (
			${SEED_STAFF_ID}::uuid,
			'John',
			'Doe',
			'john.doe@hospital.mm',
			'+959123456789',
			1,
			1,
			1,
			1,
			7,
			1
		)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: staff');

	// 8. Staff–Hospital (depends: staff, hospital) – one staff linked to all 3 hospitals
	await db.execute(sql`
		INSERT INTO staff_hospital (id, staff_id, hospital_id)
		VALUES 
			(1, ${SEED_STAFF_ID}::uuid, 1),
			(2, ${SEED_STAFF_ID}::uuid, 2),
			(3, ${SEED_STAFF_ID}::uuid, 3)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: staff_hospital');

	// 9. Staff–Department (depends: staff, department) – one staff linked to all 4 departments
	await db.execute(sql`
		INSERT INTO staff_department (id, staff_id, department_id)
		VALUES 
			(1, ${SEED_STAFF_ID}::uuid, 1),
			(2, ${SEED_STAFF_ID}::uuid, 2),
			(3, ${SEED_STAFF_ID}::uuid, 3),
			(4, ${SEED_STAFF_ID}::uuid, 4)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: staff_department');

	// 10. Staff–Role (depends: staff, role)
	await db.execute(sql`
		INSERT INTO staff_role (id, staff_id, role_id)
		VALUES (1, ${SEED_STAFF_ID}::uuid, 2)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: staff_role');

	// 11. Staff–User group (depends: staff, user_group)
	await db.execute(sql`
		INSERT INTO staff_user_group (id, staff_id, user_group_id)
		VALUES (1, ${SEED_STAFF_ID}::uuid, 2)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: staff_user_group');

	// 12. User group–Module (depends: user_group, module)
	await db.execute(sql`
		INSERT INTO user_group_module (id, user_group_id, module_id)
		VALUES 
			(1, 1, 1),
			(2, 1, 2),
			(3, 1, 3),
			(4, 1, 4),
			(5, 2, 1),
			(6, 2, 2),
			(7, 2, 3)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: user_group_module');

	// 13. User group–Page (depends: user_group, page)
	await db.execute(sql`
		INSERT INTO user_group_page (id, user_group_id, page_id)
		VALUES 
			(1, 1, 1),
			(2, 1, 2),
			(3, 1, 3),
			(4, 1, 4),
			(5, 1, 5),
			(6, 2, 1),
			(7, 2, 2),
			(8, 2, 3),
			(9, 2, 4)
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('Seeded: user_group_page');

	console.log('Information tables seeding completed.');
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
