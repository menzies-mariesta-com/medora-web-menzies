import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { uuidv7 } from 'uuidv7';
import { seedLogger } from '$lib/logger';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/** Marker on seeded transactional rows for idempotent cleanup. */
const SEED_MARKER = '[medora-seed]';

/** Default rows per entity (appointments + patient visits). Override with SEED_TRANSACTION_ROW_COUNT. */
const ROW_COUNT = Math.max(
	1,
	Number.parseInt(process.env.SEED_TRANSACTION_ROW_COUNT ?? '200', 10) || 200
);

/** Minimum seed patients to create for variety when cycling visits/appointments. */
const SEED_PATIENT_TARGET = Math.min(
	ROW_COUNT,
	Math.max(40, Math.ceil(ROW_COUNT / 5))
);

const APPOINTMENT_STATUS_IDS = [1, 2, 3, 4] as const; // unconfirmed, confirmed, check_in, cancel
const VISIT_TYPE_IDS = [1, 2, 3, 4, 5] as const; // OPD, IPD, ED, DayCare, Package
const VISIT_STATUS_IDS = [5, 6, 7, 8] as const; // open, vital, seen, closed
const VISIT_TYPE_CODES = ['O', 'I', 'E', 'DC', 'PK'] as const;

type QueryRows<T> = { rows: T[] };

function rowsOf<T>(result: unknown): T[] {
	const r = result as QueryRows<T>;
	return Array.isArray(r?.rows) ? r.rows : [];
}
type HospitalRow = { id: string; code: string | null };
type BranchRow = { id: string; hospital_id: string };
type StaffRow = { id: string; hospital_id: string };
type PatientRow = { id: string; hospital_id: string };

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function formatDateOffset(dayOffset: number): string {
	const d = new Date();
	d.setDate(d.getDate() + dayOffset);
	return d.toISOString().slice(0, 10);
}

function formatTime(hour: number, minute: number): string {
	let h = hour;
	let m = minute;
	while (m >= 60) {
		h += 1;
		m -= 60;
	}
	return `${pad2(h % 24)}:${pad2(m)}:00`;
}

async function resolveHospitalId(): Promise<string> {
	const envId = process.env.SEED_HOSPITAL_ID?.trim();
	if (envId) return envId;

	const rows = rowsOf<HospitalRow>(
		await db.execute(sql`
		SELECT id::text AS id, code
		FROM hospital
		WHERE status_id = 1
		ORDER BY created_at
		LIMIT 1
	`)
	);

	const hospital = rows[0];
	if (!hospital?.id) {
		throw new Error(
			'No active hospital found. Create a hospital first or set SEED_HOSPITAL_ID.'
		);
	}
	return hospital.id;
}

async function loadBranches(hospitalId: string): Promise<BranchRow[]> {
	const rows = rowsOf<BranchRow>(
		await db.execute(sql`
		SELECT id::text AS id, hospital_id::text AS hospital_id
		FROM hospital_branch
		WHERE hospital_id = ${hospitalId}::uuid
		  AND status_id = 1
		ORDER BY created_at
	`)
	);

	if (rows.length === 0) {
		throw new Error(
			`No active branches for hospital ${hospitalId}. Create a branch first.`
		);
	}
	return rows;
}

async function loadDoctors(hospitalId: string): Promise<StaffRow[]> {
	const rows = rowsOf<StaffRow>(
		await db.execute(sql`
		SELECT s.id::text AS id, sh.hospital_id::text AS hospital_id
		FROM staff s
		INNER JOIN staff_hospital sh ON sh.staff_id = s.id
		WHERE sh.hospital_id = ${hospitalId}::uuid
		  AND s.status_id = 1
		  AND s.staff_type_id = 3
		ORDER BY s.created_at
	`)
	);

	if (rows.length === 0) {
		throw new Error(
			`No doctors for hospital ${hospitalId}. Register at least one doctor staff member.`
		);
	}
	return rows;
}

async function cleanupPreviousSeed(hospitalId: string): Promise<void> {
	await db.execute(sql`
		DELETE FROM patient_visit
		WHERE hospital_id = ${hospitalId}::uuid
		  AND chief_complaint = ${SEED_MARKER}
	`);
	await db.execute(sql`
		DELETE FROM appointment
		WHERE hospital_id = ${hospitalId}::uuid
		  AND remark = ${SEED_MARKER}
	`);
	await db.execute(sql`
		DELETE FROM patient p
		USING "user" u
		WHERE p.user_id = u.id
		  AND p.hospital_id = ${hospitalId}::uuid
		  AND p.remark = ${SEED_MARKER}
	`);
	await db.execute(sql`
		DELETE FROM "user" u
		WHERE u.email LIKE 'seed-patient-%@heka-dev.local'
		  AND NOT EXISTS (SELECT 1 FROM patient p WHERE p.user_id = u.id)
	`);
}

async function ensureSeedPatients(hospitalId: string): Promise<PatientRow[]> {
	const existing = rowsOf<PatientRow>(
		await db.execute(sql`
		SELECT id::text AS id, hospital_id::text AS hospital_id
		FROM patient
		WHERE hospital_id = ${hospitalId}::uuid
		  AND status_id = 1
		ORDER BY created_at
	`)
	);

	const seedMarked = rowsOf<PatientRow>(
		await db.execute(sql`
		SELECT id::text AS id, hospital_id::text AS hospital_id
		FROM patient
		WHERE hospital_id = ${hospitalId}::uuid
		  AND remark = ${SEED_MARKER}
		  AND status_id = 1
		ORDER BY code
	`)
	);

	const need = Math.max(0, SEED_PATIENT_TARGET - seedMarked.length);
	if (need > 0) {
		seedLogger.info(`Creating ${need} seed patients…`);
		for (let i = 0; i < need; i++) {
			const seq = seedMarked.length + i + 1;
			const userId = uuidv7();
			const patientId = uuidv7();
			const email = `seed-patient-${hospitalId.slice(0, 8)}-${seq}@heka-dev.local`;
			const code = `SEED-${String(seq).padStart(5, '0')}`;
			const firstName = `Seed Patient ${seq}`;

			await db.execute(sql`
				INSERT INTO "user" (id, name, email, email_verified)
				VALUES (${userId}, ${firstName}, ${email}, false)
				ON CONFLICT (email) DO NOTHING
			`);

			const userRows = rowsOf<{ id: string }>(
				await db.execute(sql`
				SELECT id FROM "user" WHERE email = ${email} LIMIT 1
			`)
			);
			const resolvedUserId = userRows[0]?.id ?? userId;

			await db.execute(sql`
				INSERT INTO patient (
					id, hospital_id, user_id, code, first_name, remark, status_id
				)
				VALUES (
					${patientId}::uuid,
					${hospitalId}::uuid,
					${resolvedUserId},
					${code},
					${firstName},
					${SEED_MARKER},
					1
				)
				ON CONFLICT (id) DO NOTHING
			`);
		}
	}

	const allPatients = rowsOf<PatientRow>(
		await db.execute(sql`
		SELECT id::text AS id, hospital_id::text AS hospital_id
		FROM patient
		WHERE hospital_id = ${hospitalId}::uuid
		  AND status_id = 1
		ORDER BY created_at
	`)
	);

	if (allPatients.length === 0) {
		throw new Error(
			`No patients available for hospital ${hospitalId}. Register a patient or re-run the seed.`
		);
	}

	seedLogger.info(
		`Using ${allPatients.length} patient(s) for seed data (${existing.length} pre-existing, target ${SEED_PATIENT_TARGET} seed-marked).`
	);
	return allPatients;
}

async function seedAppointments(params: {
	hospitalId: string;
	branches: BranchRow[];
	doctors: StaffRow[];
	patients: PatientRow[];
}): Promise<{ id: number; statusTaggingId: number }[]> {
	const { hospitalId, branches, doctors, patients } = params;
	const created: { id: number; statusTaggingId: number }[] = [];

	seedLogger.info(`Seeding ${ROW_COUNT} appointments (all status types)…`);

	for (let i = 0; i < ROW_COUNT; i++) {
		const statusTaggingId =
			APPOINTMENT_STATUS_IDS[i % APPOINTMENT_STATUS_IDS.length]!;
		const branch = branches[i % branches.length]!;
		const doctor = doctors[i % doctors.length]!;
		const patient = patients[i % patients.length]!;
		const dayOffset = (i % 60) - 30; // past 30 + next 30 days
		const appointmentDate = formatDateOffset(dayOffset);
		const hour = 8 + (i % 9);
		const fromTime = formatTime(hour, (i % 4) * 15);
		const toTime = formatTime(hour, (i % 4) * 15 + 15);
		const isCancelled = statusTaggingId === 4;

		const rows = rowsOf<{ id: number; statusTaggingId: number }>(
			await db.execute(sql`
			INSERT INTO appointment (
				hospital_id,
				branch_id,
				patient_id,
				staff_id,
				appointment_date,
				from_time,
				to_time,
				patient_name,
				appointment_phone,
				status_tagging_id,
				remark,
				cancel_remark,
				status_id
			)
			VALUES (
				${hospitalId}::uuid,
				${branch.id}::uuid,
				${isCancelled && i % 8 === 0 ? null : patient.id}::uuid,
				${doctor.id}::uuid,
				${appointmentDate}::date,
				${fromTime}::time,
				${toTime}::time,
				${isCancelled && i % 8 === 0 ? `Walk-in Guest ${i + 1}` : null},
				${`09${String(10000000 + i).slice(-8)}`},
				${statusTaggingId},
				${SEED_MARKER},
				${isCancelled ? 'Seed cancellation' : null},
				1
			)
			RETURNING id, status_tagging_id AS "statusTaggingId"
		`)
		);

		const row = rows[0];
		if (row) created.push(row);
	}

	seedLogger.info(`Seeded ${created.length} appointments`);
	return created;
}

async function seedPatientVisits(params: {
	hospitalId: string;
	branches: BranchRow[];
	doctors: StaffRow[];
	patients: PatientRow[];
	checkInAppointments: { id: number }[];
}): Promise<void> {
	const { hospitalId, branches, doctors, patients, checkInAppointments } =
		params;

	seedLogger.info(`Seeding ${ROW_COUNT} patient visits (all visit types)…`);

	let inserted = 0;

	// Visits linked to check-in appointments (patient visit check-in flow)
	for (let i = 0; i < checkInAppointments.length && inserted < ROW_COUNT; i++) {
		const appt = checkInAppointments[i]!;
		const branch = branches[i % branches.length]!;
		const doctor = doctors[i % doctors.length]!;
		const patient = patients[i % patients.length]!;
		const visitNo = `SD-O-${String(inserted + 1).padStart(5, '0')}`;

		await db.execute(sql`
			INSERT INTO patient_visit (
				patient_id,
				hospital_id,
				branch_id,
				appointment_id,
				doctor_id,
				status_tagging_id,
				visit_type_id,
				visit_no,
				chief_complaint,
				status_id
			)
			VALUES (
				${patient.id}::uuid,
				${hospitalId}::uuid,
				${branch.id}::uuid,
				${appt.id},
				${doctor.id}::uuid,
				5,
				1,
				${visitNo},
				${SEED_MARKER},
				1
			)
		`);
		inserted++;
	}

	// Walk-in / direct check-in visits across all visit types and statuses
	while (inserted < ROW_COUNT) {
		const idx = inserted;
		const visitTypeIdx = idx % VISIT_TYPE_IDS.length;
		const visitTypeId = VISIT_TYPE_IDS[visitTypeIdx]!;
		const visitTypeCode = VISIT_TYPE_CODES[visitTypeIdx]!;
		const visitStatusId = VISIT_STATUS_IDS[idx % VISIT_STATUS_IDS.length]!;
		const branch = branches[idx % branches.length]!;
		const doctor = doctors[idx % doctors.length]!;
		const patient = patients[idx % patients.length]!;
		const visitNo = `SD-${visitTypeCode}-${String(idx + 1).padStart(5, '0')}`;

		await db.execute(sql`
			INSERT INTO patient_visit (
				patient_id,
				hospital_id,
				branch_id,
				doctor_id,
				status_tagging_id,
				visit_type_id,
				visit_no,
				chief_complaint,
				status_id
			)
			VALUES (
				${patient.id}::uuid,
				${hospitalId}::uuid,
				${branch.id}::uuid,
				${doctor.id}::uuid,
				${visitStatusId},
				${visitTypeId},
				${visitNo},
				${SEED_MARKER},
				1
			)
		`);
		inserted++;
	}

	seedLogger.info(`Seeded ${inserted} patient visits`);
}

/**
 * Seed transactional demo data: appointments (all statuses) and patient visits
 * (all visit types + statuses), including check-in visits linked to appointments.
 *
 * Requires an existing hospital with branches, doctors, and at least one patient
 * (or the script will create seed patients).
 *
 * Env:
 * - `SEED_HOSPITAL_ID` — optional hospital UUID (defaults to first active hospital)
 * - `SEED_TRANSACTION_ROW_COUNT` — rows per entity (default 200)
 *
 * npx tsx src/lib/server/db/seed/transaction-table-seed.ts
 */
export async function seedTransactionTables() {
	seedLogger.info(
		`Seeding transaction tables (${ROW_COUNT} appointments + ${ROW_COUNT} visits)…`
	);

	const hospitalId = await resolveHospitalId();
	const [branches, doctors] = await Promise.all([
		loadBranches(hospitalId),
		loadDoctors(hospitalId)
	]);

	await cleanupPreviousSeed(hospitalId);
	const patients = await ensureSeedPatients(hospitalId);

	const appointments = await seedAppointments({
		hospitalId,
		branches,
		doctors,
		patients
	});

	const checkInAppointments = appointments
		.filter((a) => a.statusTaggingId === 3)
		.map((a) => ({ id: a.id }));

	await seedPatientVisits({
		hospitalId,
		branches,
		doctors,
		patients,
		checkInAppointments
	});

	seedLogger.info('Transaction table seeding completed');
}

seedTransactionTables()
	.then(() => {
		seedLogger.info('Transaction table seeding finished');
		process.exit(0);
	})
	.catch((error) => {
		seedLogger.error(
			'Error while seeding transaction tables',
			error instanceof Error ? error : new Error(String(error))
		);
		process.exit(1);
	});
