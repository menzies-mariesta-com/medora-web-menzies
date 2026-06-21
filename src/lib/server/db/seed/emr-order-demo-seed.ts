import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import argon2 from 'argon2';
import { uuidv7 } from 'uuidv7';
import { seedLogger } from '$lib/logger';
import { RoleEnum, StaffTypeEnum, StatusEnum } from '$lib/model/enum/db-link';
import {
	EMR_DEMO_SERVICES,
	EMR_DEMO_SUB_CATEGORIES,
	MIN_SEEDED_DOCTORS,
	MIN_SEEDED_SERVICES,
	SEED_DOCTOR_PASSWORD
} from './emr-order-demo-catalog';

type SeedDb = NeonHttpDatabase<Record<string, never>>;

type QueryRows<T> = { rows: T[] };

function rowsOf<T>(result: unknown): T[] {
	const r = result as QueryRows<T>;
	return Array.isArray(r?.rows) ? r.rows : [];
}

type HospitalRow = { id: string; code: string | null; name: string | null };
type BranchRow = { id: string };
type IdRow = { id: number };

const DOCTOR_FIRST_NAMES = [
	'Aung',
	'Kyaw',
	'Min',
	'Hla',
	'Thiri',
	'Zaw',
	'Su',
	'Myat',
	'Nanda',
	'Ye',
	'Hnin',
	'Paing',
	'Thant',
	'Wai',
	'Ei',
	'Chan',
	'Lin',
	'Oo',
	'Phyo',
	'Sandar'
];

const DOCTOR_LAST_NAMES = [
	'Win',
	'Htun',
	'Myint',
	'Ko',
	'Maung',
	'Tun',
	'Soe',
	'Lwin',
	'Aye',
	'Htet',
	'Zin',
	'Naing',
	'Moe',
	'Kyaw',
	'Thant',
	'Yee',
	'Hlaing',
	'Bo',
	'Chit',
	'Khaing'
];

function hospitalSlug(row: HospitalRow): string {
	const code = row.code?.trim();
	if (code) {
		return code.replace(/[^\w-]+/g, '').slice(0, 24) || 'hosp';
	}
	return row.id.replace(/-/g, '').slice(0, 12);
}

function escapeSqlString(value: string): string {
	return value.replace(/'/g, "''");
}

async function hashSeedDoctorPassword(password: string): Promise<string> {
	return argon2.hash(password, {
		type: argon2.argon2id,
		memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 64 * 1024),
		timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
		parallelism: Number(process.env.ARGON2_PARALLELISM ?? 4),
		hashLength: Number(process.env.ARGON2_HASH_LENGTH ?? 32)
	});
}

export async function seedEmrDemoSubCategories(db: SeedDb): Promise<void> {
	const values = EMR_DEMO_SUB_CATEGORIES.map(
		(sc) =>
			`(${sc.id}, ${sc.categoryId}, '${escapeSqlString(sc.name)}', ${StatusEnum.ACTIVE})`
	).join(',\n\t\t\t');

	await db.execute(
		sql.raw(`
		INSERT INTO sub_category (id, category_id, sub_category_name, status_id)
		VALUES
			${values}
		ON CONFLICT (id) DO UPDATE SET
			category_id = EXCLUDED.category_id,
			sub_category_name = EXCLUDED.sub_category_name,
			status_id = EXCLUDED.status_id;
	`)
	);
	seedLogger.info(
		`Seeded: sub_category (EMR demo catalog, ${EMR_DEMO_SUB_CATEGORIES.length} rows)`
	);
}

async function countHospitalServices(
	db: SeedDb,
	hospitalId: string
): Promise<number> {
	const rows = rowsOf<{ count: number }>(
		await db.execute(
			sql`SELECT COUNT(*)::int AS count FROM service_item WHERE hospital_id = ${hospitalId}::uuid AND status_id != ${StatusEnum.DELETED}`
		)
	);
	return Number(rows[0]?.count ?? 0);
}

async function countHospitalDoctors(
	db: SeedDb,
	hospitalId: string
): Promise<number> {
	const rows = rowsOf<{ count: number }>(
		await db.execute(
			sql`
		SELECT COUNT(*)::int AS count
		FROM staff s
		INNER JOIN staff_hospital sh ON sh.staff_id = s.id
		WHERE sh.hospital_id = ${hospitalId}::uuid
		  AND s.staff_type_id = ${StaffTypeEnum.DOCTOR}
		  AND s.status_id != ${StatusEnum.DELETED}
	`
		)
	);
	return Number(rows[0]?.count ?? 0);
}

async function loadActiveHospitals(db: SeedDb): Promise<HospitalRow[]> {
	return rowsOf<HospitalRow>(
		await db.execute(
			sql`SELECT id::text AS id, code, name FROM hospital WHERE status_id = ${StatusEnum.ACTIVE}`
		)
	);
}

async function loadHospitalBranches(
	db: SeedDb,
	hospitalId: string
): Promise<BranchRow[]> {
	return rowsOf<BranchRow>(
		await db.execute(
			sql`
		SELECT id::text AS id
		FROM hospital_branch
		WHERE hospital_id = ${hospitalId}::uuid
		  AND status_id = ${StatusEnum.ACTIVE}
	`
		)
	);
}

async function loadSpecializationIds(db: SeedDb): Promise<number[]> {
	const rows = rowsOf<IdRow>(
		await db.execute(
			sql`SELECT id FROM specialization WHERE status_id = ${StatusEnum.ACTIVE} ORDER BY id`
		)
	);
	const ids = rows.map((r) => r.id);
	return ids.length > 0 ? ids : [1];
}

async function seedServicesForHospital(
	db: SeedDb,
	hospitalId: string,
	branches: BranchRow[]
): Promise<{ insertedServices: number; insertedTaggings: number; skipped: boolean }> {
	const existingCount = await countHospitalServices(db, hospitalId);
	if (existingCount >= MIN_SEEDED_SERVICES) {
		return { insertedServices: 0, insertedTaggings: 0, skipped: true };
	}

	if (branches.length === 0) {
		seedLogger.warn(
			`EMR demo seed: hospital ${hospitalId} has no branches — skipping service tagging`
		);
	}

	let insertedServices = 0;

	for (const svc of EMR_DEMO_SERVICES) {
		const exists = rowsOf<{ id: number }>(
			await db.execute(
				sql`
			SELECT id FROM service_item
			WHERE hospital_id = ${hospitalId}::uuid
			  AND service_code = ${svc.serviceCode}
			LIMIT 1
		`
			)
		);
		if (exists.length > 0) continue;

		await db.execute(
			sql`
			INSERT INTO service_item (
				hospital_id, sub_category_id, service_name, service_code, status_id
			) VALUES (
				${hospitalId}::uuid,
				${svc.subCategoryId},
				${svc.serviceName},
				${svc.serviceCode},
				${StatusEnum.ACTIVE}
			)
		`
		);
		insertedServices += 1;
	}

	let insertedTaggings = 0;
	for (const branch of branches) {
		for (const svc of EMR_DEMO_SERVICES) {
			const serviceRows = rowsOf<{ id: number }>(
				await db.execute(
					sql`
				SELECT id FROM service_item
				WHERE hospital_id = ${hospitalId}::uuid
				  AND service_code = ${svc.serviceCode}
				LIMIT 1
			`
				)
			);
			if (serviceRows.length === 0) continue;
			const serviceId = serviceRows[0]!.id;

			const tagExists = rowsOf<{ ok: number }>(
				await db.execute(
					sql`
				SELECT 1 AS ok FROM service_tagging
				WHERE branch_id = ${branch.id}::uuid
				  AND service_id = ${serviceId}
				LIMIT 1
			`
				)
			);
			if (tagExists.length > 0) continue;

			await db.execute(
				sql`
				INSERT INTO service_tagging (
					branch_id, service_id, valid_date, service_amount, service_tax_amount, allow_edit, status_id
				) VALUES (
					${branch.id}::uuid,
					${serviceId},
					NULL,
					${String(svc.defaultAmount)},
					${String(svc.defaultTax)},
					true,
					${StatusEnum.ACTIVE}
				)
			`
			);
			insertedTaggings += 1;
		}
	}

	return { insertedServices, insertedTaggings, skipped: false };
}

async function seedDoctorsForHospital(
	db: SeedDb,
	hospital: HospitalRow,
	branches: BranchRow[],
	specializationIds: number[]
): Promise<{ insertedDoctors: number; skipped: boolean }> {
	const hospitalId = hospital.id;
	const existingCount = await countHospitalDoctors(db, hospitalId);
	if (existingCount >= MIN_SEEDED_DOCTORS) {
		return { insertedDoctors: 0, skipped: true };
	}

	const toCreate = MIN_SEEDED_DOCTORS - existingCount;
	const slug = hospitalSlug(hospital);
	const hashedPassword = await hashSeedDoctorPassword(SEED_DOCTOR_PASSWORD);

	let insertedDoctors = 0;
	const startIndex = existingCount + 1;

	for (let i = 0; i < toCreate; i += 1) {
		const seq = startIndex + i;
		const seqPadded = String(seq).padStart(3, '0');
		const email = `seed-doctor-${slug}-${seqPadded}@heka-dev.local`;

		const emailTaken = rowsOf<{ id: string }>(
			await db.execute(
				sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`
			)
		);
		if (emailTaken.length > 0) continue;

		const firstName =
			DOCTOR_FIRST_NAMES[(seq - 1) % DOCTOR_FIRST_NAMES.length] ?? 'Seed';
		const lastName =
			DOCTOR_LAST_NAMES[(seq - 1) % DOCTOR_LAST_NAMES.length] ?? 'Doctor';
		const fullName = `${firstName} ${lastName}`;
		const userId = uuidv7();
		const accountId = uuidv7();
		const staffId = uuidv7();
		const specializationId =
			specializationIds[(seq - 1) % specializationIds.length] ?? 1;
		const genderId = ((seq - 1) % 2) + 1;
		const titleId = 1;
		const staffCode = `SEED-DOC-${seqPadded}`;
		const licenseNo = `SEED-LIC-${slug}-${seqPadded}`;

		await db.execute(
			sql`
			INSERT INTO staff_detail (license_no, designation, status_id)
			VALUES (${licenseNo}, ${'Medical Officer'}, ${StatusEnum.ACTIVE})
		`
		);

		const detailRow = rowsOf<IdRow>(
			await db.execute(
				sql`SELECT id FROM staff_detail WHERE license_no = ${licenseNo} ORDER BY id DESC LIMIT 1`
			)
		);
		const staffDetailId = detailRow[0]?.id;
		if (staffDetailId == null) {
			throw new Error(`Failed to create staff_detail for ${email}`);
		}

		await db.execute(
			sql`
			INSERT INTO "user" (id, name, email, email_verified, role_id)
			VALUES (
				${userId},
				${fullName},
				${email},
				false,
				${RoleEnum.STAFF}
			)
		`
		);

		await db.execute(
			sql`
			INSERT INTO account (id, user_id, account_id, provider_id, password)
			VALUES (
				${accountId},
				${userId},
				${email},
				'credential',
				${hashedPassword}
			)
		`
		);

		await db.execute(
			sql`
			INSERT INTO staff (
				id, user_id, first_name, last_name, code,
				staff_type_id, staff_employment_type_id, title_id,
				specialization_id, gender_id, staff_detail_id, status_id
			) VALUES (
				${staffId},
				${userId},
				${firstName},
				${lastName},
				${staffCode},
				${StaffTypeEnum.DOCTOR},
				1,
				${titleId},
				${specializationId},
				${genderId},
				${staffDetailId},
				${StatusEnum.ACTIVE}
			)
		`
		);

		await db.execute(
			sql`
			INSERT INTO staff_hospital (staff_id, hospital_id)
			VALUES (${staffId}, ${hospitalId}::uuid)
		`
		);

		for (const branch of branches) {
			await db.execute(
				sql`
				INSERT INTO staff_branch (staff_id, branch_id)
				SELECT ${staffId}, ${branch.id}::uuid
				WHERE NOT EXISTS (
					SELECT 1 FROM staff_branch sb
					WHERE sb.staff_id = ${staffId}
					  AND sb.branch_id = ${branch.id}::uuid
				)
			`
			);
		}

		insertedDoctors += 1;
	}

	return { insertedDoctors, skipped: false };
}

export async function seedEmrDemoForAllHospitals(db: SeedDb): Promise<void> {
	const hospitals = await loadActiveHospitals(db);
	if (hospitals.length === 0) {
		seedLogger.info(
			'EMR demo seed: no active hospitals — skip services/doctors (create a hospital, then re-run db:seed:information)'
		);
		return;
	}

	const specializationIds = await loadSpecializationIds(db);

	for (const hospital of hospitals) {
		const branches = await loadHospitalBranches(db, hospital.id);
		const label = hospital.name ?? hospital.code ?? hospital.id;

		const serviceResult = await seedServicesForHospital(
			db,
			hospital.id,
			branches
		);
		if (serviceResult.skipped) {
			seedLogger.info(
				`EMR demo seed [${label}]: services skipped (already ${MIN_SEEDED_SERVICES}+ items)`
			);
		} else {
			seedLogger.info(
				`EMR demo seed [${label}]: +${serviceResult.insertedServices} service_item, +${serviceResult.insertedTaggings} service_tagging (${branches.length} branches)`
			);
		}

		const doctorResult = await seedDoctorsForHospital(
			db,
			hospital,
			branches,
			specializationIds
		);
		if (doctorResult.skipped) {
			seedLogger.info(
				`EMR demo seed [${label}]: doctors skipped (already ${MIN_SEEDED_DOCTORS}+ doctors)`
			);
		} else {
			seedLogger.info(
				`EMR demo seed [${label}]: +${doctorResult.insertedDoctors} doctors (login password: ${SEED_DOCTOR_PASSWORD})`
			);
		}
	}

	seedLogger.info(
		`EMR demo seed complete. Doctor login password for seeded accounts: ${SEED_DOCTOR_PASSWORD}`
	);
}
