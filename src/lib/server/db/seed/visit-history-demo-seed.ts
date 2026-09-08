/**
 * Aryuda-scoped Patient Visit History Dashboard demo seed.
 *
 * Prerequisites:
 *   pnpm db:seed:information   # EMR services + doctors
 *   pnpm db:seed:visit-history # this script
 *
 * Env:
 *   SEED_HOSPITAL_ID — optional; defaults to first active hospital matching "aryuda"
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { uuidv7 } from 'uuidv7';
import { seedLogger } from '$lib/logger';
import { CategoryEnum, RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import {
	DEMO_PATIENTS,
	FORM_NAME_CHIEF_COMPLAINT_ID,
	FORM_NAME_PATIENT_CONDITION_ID,
	HERO_DEMO_PATIENT_SEQ,
	MIN_VISITS_PER_DEMO_PATIENT,
	PHARMACY_GENERIC_DEFS,
	VH_DEMO_MARKER,
	demoVisitNo,
	type DemoPatientDef,
	type VisitScenarioDef
} from './visit-history-demo-catalog';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const db = drizzle(neon(process.env.DATABASE_URL));

type QueryRows<T> = { rows: T[] };

function rowsOf<T>(result: unknown): T[] {
	const r = result as QueryRows<T>;
	return Array.isArray(r?.rows) ? r.rows : [];
}

type HospitalRow = { id: string; code: string | null; name: string | null };
type BranchRow = { id: string };
type StaffRow = { id: string };
type ServiceRow = { id: number; service_name: string | null };
type ItemRow = { id: number; item_name: string | null };
type MedMasterRow = { id: number };
type DemoEntryPoint = {
	patientCode: string;
	visitId: number;
	visitNo: string;
};

function formatDateOffset(dayOffset: number): string {
	const d = new Date();
	d.setDate(d.getDate() - dayOffset);
	return d.toISOString();
}

async function resolveAryudaHospitalId(): Promise<HospitalRow> {
	const envId = process.env.SEED_HOSPITAL_ID?.trim();
	if (envId) {
		const rows = rowsOf<HospitalRow>(
			await db.execute(sql`
				SELECT id::text AS id, code, name
				FROM hospital
				WHERE id = ${envId}::uuid AND status_id = 1
				LIMIT 1
			`)
		);
		const row = rows[0];
		if (!row?.id) {
			throw new Error(`SEED_HOSPITAL_ID ${envId} is not an active hospital.`);
		}
		return row;
	}

	const rows = rowsOf<HospitalRow>(
		await db.execute(sql`
			SELECT id::text AS id, code, name
			FROM hospital
			WHERE status_id = 1
			  AND (
			    code ILIKE '%aryuda%'
			    OR name ILIKE '%aryuda%'
			  )
			ORDER BY created_at
			LIMIT 1
		`)
	);
	const row = rows[0];
	if (!row?.id) {
		throw new Error(
			'No active Aryuda hospital found. Set SEED_HOSPITAL_ID or create the hospital first.'
		);
	}
	return row;
}

async function loadBranches(hospitalId: string): Promise<BranchRow[]> {
	const rows = rowsOf<BranchRow>(
		await db.execute(sql`
			SELECT id::text AS id
			FROM hospital_branch
			WHERE hospital_id = ${hospitalId}::uuid
			  AND status_id = 1
			ORDER BY created_at
		`)
	);
	if (rows.length === 0) {
		throw new Error(`No active branches for hospital ${hospitalId}.`);
	}
	return rows;
}

async function loadDoctors(hospitalId: string): Promise<StaffRow[]> {
	const rows = rowsOf<StaffRow>(
		await db.execute(sql`
			SELECT s.id::text AS id
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
			`No doctors for hospital ${hospitalId}. Run pnpm db:seed:information first.`
		);
	}
	return rows;
}

async function loadServiceItems(hospitalId: string): Promise<ServiceRow[]> {
	return rowsOf<ServiceRow>(
		await db.execute(sql`
			SELECT id, service_name
			FROM service_item
			WHERE hospital_id = ${hospitalId}::uuid
			  AND status_id = 1
			ORDER BY id
			LIMIT 30
		`)
	);
}

async function loadMedOrderMasters(): Promise<{
	doseUnitId: number;
	frequencyId: number;
	durationUnitId: number;
	foodRelationId: number | null;
}> {
	const dose = rowsOf<MedMasterRow>(
		await db.execute(sql`
			SELECT id FROM med_order_dose_unit
			WHERE status_id = 1 AND deleted_at IS NULL
			ORDER BY id LIMIT 1
		`)
	);
	const freq = rowsOf<MedMasterRow>(
		await db.execute(sql`
			SELECT id FROM med_order_frequency
			WHERE status_id = 1 AND deleted_at IS NULL
			ORDER BY id LIMIT 1
		`)
	);
	const dur = rowsOf<MedMasterRow>(
		await db.execute(sql`
			SELECT id FROM med_order_duration_unit
			WHERE status_id = 1 AND deleted_at IS NULL
			ORDER BY id LIMIT 1
		`)
	);
	const food = rowsOf<MedMasterRow>(
		await db.execute(sql`
			SELECT id FROM med_order_food_relation
			WHERE status_id = 1 AND deleted_at IS NULL
			ORDER BY id LIMIT 1
		`)
	);
	const doseUnitId = dose[0]?.id;
	const frequencyId = freq[0]?.id;
	const durationUnitId = dur[0]?.id;
	if (!doseUnitId || !frequencyId || !durationUnitId) {
		throw new Error(
			'Med order master rows missing. Run pnpm db:seed:master first.'
		);
	}
	return {
		doseUnitId,
		frequencyId,
		durationUnitId,
		foodRelationId: food[0]?.id ?? null
	};
}

async function ensureDemoStore(
	hospitalId: string,
	branchId: string
): Promise<number> {
	const existing = rowsOf<{ id: number }>(
		await db.execute(sql`
			SELECT s.id
			FROM store s
			INNER JOIN hospital_branch hb ON hb.id = s.branch_id
			WHERE hb.hospital_id = ${hospitalId}::uuid
			  AND s.status_id = 1
			ORDER BY s.id
			LIMIT 1
		`)
	);
	if (existing[0]?.id) return existing[0].id;

	const created = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO store (branch_id, store_name, remark, status_id)
			VALUES (
				${branchId}::uuid,
				'VH Demo Pharmacy Store',
				${VH_DEMO_MARKER},
				${StatusEnum.ACTIVE}
			)
			RETURNING id
		`)
	);
	const id = created[0]?.id;
	if (!id) throw new Error('Failed to create demo store.');
	seedLogger.info(`Created demo store id=${id} for visit-history seed`);
	return id;
}

async function seedPharmacyCatalog(
	hospitalId: string
): Promise<ItemRow[]> {
	const existingCount = rowsOf<{ c: number }>(
		await db.execute(sql`
			SELECT COUNT(*)::int AS c
			FROM pharmacy_generic
			WHERE hospital_id = ${hospitalId}::uuid
			  AND code LIKE 'VH-%'
		`)
	);
	if ((existingCount[0]?.c ?? 0) >= PHARMACY_GENERIC_DEFS.length) {
		return rowsOf<ItemRow>(
			await db.execute(sql`
				SELECT im.id, im.item_name
				FROM item_master im
				INNER JOIN pharmacy_generic pg ON pg.id = im.pharmacy_generic_id
				WHERE im.hospital_id = ${hospitalId}::uuid
				  AND pg.code LIKE 'VH-%'
				  AND im.status_id = 1
				ORDER BY im.id
			`)
		);
	}

	seedLogger.info(
		`Seeding pharmacy catalog (${PHARMACY_GENERIC_DEFS.length} generics + items)…`
	);

	for (const def of PHARMACY_GENERIC_DEFS) {
		await db.execute(sql`
			INSERT INTO pharmacy_generic (hospital_id, name, code, status_id)
			SELECT ${hospitalId}::uuid, ${def.name}, ${def.code}, ${StatusEnum.ACTIVE}
			WHERE NOT EXISTS (
				SELECT 1 FROM pharmacy_generic
				WHERE hospital_id = ${hospitalId}::uuid AND code = ${def.code}
			)
		`);

		const genericRows = rowsOf<{ id: number }>(
			await db.execute(sql`
				SELECT id FROM pharmacy_generic
				WHERE hospital_id = ${hospitalId}::uuid AND code = ${def.code}
				LIMIT 1
			`)
		);
		const genericId = genericRows[0]?.id;
		if (!genericId) continue;

		await db.execute(sql`
			INSERT INTO item_master (
				hospital_id,
				item_name,
				category_id,
				item_code,
				pharmacy_generic_id,
				remark,
				status_id
			)
			SELECT
				${hospitalId}::uuid,
				${def.itemName},
				${CategoryEnum.PHARMACY_SUPPLY},
				${def.itemCode},
				${genericId},
				${VH_DEMO_MARKER},
				${StatusEnum.ACTIVE}
			WHERE NOT EXISTS (
				SELECT 1 FROM item_master
				WHERE hospital_id = ${hospitalId}::uuid AND item_code = ${def.itemCode}
			)
		`);
	}

	return rowsOf<ItemRow>(
		await db.execute(sql`
			SELECT im.id, im.item_name
			FROM item_master im
			INNER JOIN pharmacy_generic pg ON pg.id = im.pharmacy_generic_id
			WHERE im.hospital_id = ${hospitalId}::uuid
			  AND pg.code LIKE 'VH-%'
			  AND im.status_id = 1
			ORDER BY im.id
		`)
	);
}

async function shouldSkipPatient(
	hospitalId: string,
	patientCode: string
): Promise<boolean> {
	const visitCount = rowsOf<{ c: number }>(
		await db.execute(sql`
			SELECT COUNT(*)::int AS c
			FROM patient_visit pv
			INNER JOIN patient p ON p.id = pv.patient_id
			WHERE p.hospital_id = ${hospitalId}::uuid
			  AND p.code = ${patientCode}
			  AND pv.visit_no LIKE 'VH-%'
			  AND pv.status_id != ${StatusEnum.DELETED}
		`)
	);
	if ((visitCount[0]?.c ?? 0) < MIN_VISITS_PER_DEMO_PATIENT) {
		return false;
	}

	const clinical = rowsOf<{ c: number }>(
		await db.execute(sql`
			SELECT COUNT(*)::int AS c
			FROM patient_visit pv
			INNER JOIN patient p ON p.id = pv.patient_id
			LEFT JOIN service_order so ON so.visit_id = pv.id
			LEFT JOIN medication_order_batch mob ON mob.visit_id = pv.id AND mob.deleted_at IS NULL
			WHERE p.hospital_id = ${hospitalId}::uuid
			  AND p.code = ${patientCode}
			  AND pv.visit_no LIKE 'VH-%'
			  AND (so.id IS NOT NULL OR mob.id IS NOT NULL)
		`)
	);
	return (clinical[0]?.c ?? 0) >= 1;
}

async function ensureDemoPatient(
	hospitalId: string,
	def: DemoPatientDef
): Promise<string> {
	const existing = rowsOf<{ id: string }>(
		await db.execute(sql`
			SELECT id::text AS id FROM patient
			WHERE hospital_id = ${hospitalId}::uuid AND code = ${def.code}
			LIMIT 1
		`)
	);
	if (existing[0]?.id) return existing[0].id;

	const userId = uuidv7();
	const patientId = uuidv7();
	const email = `vh-demo-${hospitalId.slice(0, 8)}-${String(def.seq).padStart(2, '0')}@heka-dev.local`;
	const displayName = `${def.firstName} ${def.lastName}`.trim();

	await db.execute(sql`
		INSERT INTO "user" (id, name, email, email_verified, role_id)
		VALUES (${userId}, ${displayName}, ${email}, false, ${RoleEnum.STAFF})
		ON CONFLICT (email) DO NOTHING
	`);

	const userRows = rowsOf<{ id: string }>(
		await db.execute(sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`)
	);
	const resolvedUserId = userRows[0]?.id ?? userId;

	await db.execute(sql`
		INSERT INTO patient (
			id,
			hospital_id,
			code,
			first_name,
			last_name,
			user_id,
			gender_id,
			date_of_birth,
			remark,
			status_id
		)
		VALUES (
			${patientId}::uuid,
			${hospitalId}::uuid,
			${def.code},
			${def.firstName},
			${def.lastName},
			${resolvedUserId},
			${(def.seq % 2) + 1},
			${`198${(def.seq % 9) + 1}-0${(def.seq % 8) + 1}-15`},
			${VH_DEMO_MARKER},
			${StatusEnum.ACTIVE}
		)
		ON CONFLICT DO NOTHING
	`);

	const patientRows = rowsOf<{ id: string }>(
		await db.execute(sql`
			SELECT id::text AS id FROM patient
			WHERE hospital_id = ${hospitalId}::uuid AND code = ${def.code}
			LIMIT 1
		`)
	);
	const id = patientRows[0]?.id;
	if (!id) throw new Error(`Failed to create patient ${def.code}`);
	return id;
}

async function insertVisit(
	params: {
		patientId: string;
		hospitalId: string;
		branchId: string;
		doctorId: string;
		visitNo: string;
		scenario: VisitScenarioDef;
	}
): Promise<number> {
	const createdAt = formatDateOffset(params.scenario.daysAgo);
	const rows = rowsOf<{ id: number }>(
		await db.execute(sql`
			INSERT INTO patient_visit (
				patient_id,
				hospital_id,
				branch_id,
				doctor_id,
				status_tagging_id,
				visit_type_id,
				visit_no,
				diagnosis_notes,
				status_id,
				created_at,
				updated_at
			)
			VALUES (
				${params.patientId}::uuid,
				${params.hospitalId}::uuid,
				${params.branchId}::uuid,
				${params.doctorId}::uuid,
				${params.scenario.statusTaggingId},
				${params.scenario.visitTypeId},
				${params.visitNo},
				${params.scenario.diagnosisNotes},
				${StatusEnum.ACTIVE},
				${createdAt}::timestamptz,
				${createdAt}::timestamptz
			)
			RETURNING id
		`)
	);
	const id = rows[0]?.id;
	if (!id) throw new Error(`Failed to create visit ${params.visitNo}`);
	return id;
}

async function seedClinicalForVisit(params: {
	hospitalId: string;
	patientId: string;
	branchId: string;
	doctorId: string;
	visitId: number;
	scenario: VisitScenarioDef;
	services: ServiceRow[];
	pharmacyItems: ItemRow[];
	storeId: number;
	medMasters: Awaited<ReturnType<typeof loadMedOrderMasters>>;
}): Promise<void> {
	const {
		patientId,
		branchId,
		doctorId,
		visitId,
		scenario,
		services,
		pharmacyItems,
		storeId,
		medMasters
	} = params;

	if (scenario.chiefComplaint.trim()) {
		await db.execute(sql`
			INSERT INTO patient_form_entry (
				branch_id, patient_id, visit_id, form_name_id, description, status_id
			)
			VALUES (
				${branchId}::uuid,
				${patientId}::uuid,
				${visitId},
				${FORM_NAME_CHIEF_COMPLAINT_ID},
				${scenario.chiefComplaint},
				${StatusEnum.ACTIVE}
			)
		`);
	}

	if (
		scenario.depth !== 'light' &&
		scenario.patientCondition.trim()
	) {
		await db.execute(sql`
			INSERT INTO patient_form_entry (
				branch_id, patient_id, visit_id, form_name_id, description, status_id
			)
			VALUES (
				${branchId}::uuid,
				${patientId}::uuid,
				${visitId},
				${FORM_NAME_PATIENT_CONDITION_ID},
				${scenario.patientCondition},
				${StatusEnum.ACTIVE}
			)
		`);
	}

	for (const dx of scenario.diagnoses) {
		await db.execute(sql`
			INSERT INTO diagnosis (
				branch_id, patient_id, visit_id, diagnosis_type_id, description, status_id
			)
			VALUES (
				${branchId}::uuid,
				${patientId}::uuid,
				${visitId},
				${dx.diagnosisTypeId},
				${dx.description},
				${StatusEnum.ACTIVE}
			)
		`);
	}

	for (const symptom of scenario.symptoms) {
		if (!symptom.trim() || symptom.toLowerCase() === 'none reported') {
			continue;
		}
		await db.execute(sql`
			INSERT INTO patient_diagnosis (
				patient_id, hospital_id, visit_id, status_id, symptom, vital_date_time
			)
			VALUES (
				${patientId}::uuid,
				${params.hospitalId}::uuid,
				${visitId},
				${StatusEnum.ACTIVE},
				${symptom},
				NOW()
			)
		`);
	}

	if (scenario.serviceOrderLineCount > 0 && services.length > 0) {
		const orderRows = rowsOf<{ id: number }>(
			await db.execute(sql`
				INSERT INTO service_order (branch_id, visit_id, order_no, status_id, order_date)
				VALUES (
					${branchId}::uuid,
					${visitId},
					${`VH-ORD-${visitId}`},
					${StatusEnum.ACTIVE},
					CURRENT_DATE
				)
				RETURNING id
			`)
		);
		const orderId = orderRows[0]?.id;
		if (orderId) {
			const lineCount = Math.min(
				scenario.serviceOrderLineCount,
				services.length
			);
			for (let i = 0; i < lineCount; i++) {
				const svc = services[i]!;
				await db.execute(sql`
					INSERT INTO service_order_detail (
						service_order_id,
						service_id,
						advising_doctor_id,
						service_amount,
						service_unit,
						instruction,
						status_id
					)
					VALUES (
						${orderId},
						${svc.id},
						${doctorId}::uuid,
						${(500 + i * 250).toFixed(2)},
						1,
						${`Demo order: ${svc.service_name ?? 'Service'}`},
						${StatusEnum.ACTIVE}
					)
				`);
			}
		}
	}

	if (
		scenario.depth === 'full' &&
		scenario.medicationLineCount > 0 &&
		pharmacyItems.length > 0
	) {
		const batchNo = `VH-MED-${visitId}`;
		const batchRows = rowsOf<{ id: number }>(
			await db.execute(sql`
				INSERT INTO medication_order_batch (
					hospital_id, visit_id, store_id, batch_no, batch_remarks
				)
				VALUES (
					${params.hospitalId}::uuid,
					${visitId},
					${storeId},
					${batchNo},
					${VH_DEMO_MARKER}
				)
				RETURNING id
			`)
		);
		const batchId = batchRows[0]?.id;
		if (batchId) {
			const lineCount = Math.min(
				scenario.medicationLineCount,
				pharmacyItems.length
			);
			for (let i = 0; i < lineCount; i++) {
				const item = pharmacyItems[i]!;
				const foodSql =
					medMasters.foodRelationId != null
						? String(medMasters.foodRelationId)
						: 'NULL';
				await db.execute(
					sql.raw(`
					INSERT INTO medication_order_line (
						batch_id,
						line_no,
						item_master_id,
						dose,
						dose_unit_id,
						frequency_id,
						duration_value,
						duration_unit_id,
						food_relation_id,
						start_at,
						line_remarks
					)
					VALUES (
						${batchId},
						${i + 1},
						${item.id},
						${(i + 1).toFixed(2)},
						${medMasters.doseUnitId},
						${medMasters.frequencyId},
						${7 + i},
						${medMasters.durationUnitId},
						${foodSql},
						NOW(),
						'Demo prescription line'
					)
				`)
				);
			}
		}

		if (scenario.prescriptionNote.trim()) {
			await db.execute(sql`
				INSERT INTO cpoe_prescription_note (
					branch_id,
					patient_id,
					visit_id,
					note,
					sequence_no,
					doctor_id,
					status_id
				)
				VALUES (
					${branchId}::uuid,
					${patientId}::uuid,
					${visitId},
					${scenario.prescriptionNote},
					1,
					${doctorId}::uuid,
					${StatusEnum.ACTIVE}
				)
			`);
		}
	}
}

export async function seedVisitHistoryDemo(): Promise<void> {
	seedLogger.info('Seeding visit history demo (Aryuda)…');

	const hospital = await resolveAryudaHospitalId();
	const hospitalId = hospital.id;
	seedLogger.info(
		`Target hospital: ${hospital.name ?? hospital.code ?? hospitalId} (${hospitalId})`
	);

	const [branches, doctors, services, medMasters] = await Promise.all([
		loadBranches(hospitalId),
		loadDoctors(hospitalId),
		loadServiceItems(hospitalId),
		loadMedOrderMasters()
	]);

	if (services.length === 0) {
		throw new Error(
			'No service_item rows for hospital. Run pnpm db:seed:information first.'
		);
	}

	const storeId = await ensureDemoStore(hospitalId, branches[0]!.id);
	const pharmacyItems = await seedPharmacyCatalog(hospitalId);

	const entryPoints: DemoEntryPoint[] = [];
	let patientsSkipped = 0;
	let patientsSeeded = 0;

	for (const patientDef of DEMO_PATIENTS) {
		if (await shouldSkipPatient(hospitalId, patientDef.code)) {
			seedLogger.info(
				`Visit history demo [${patientDef.code}]: skipped (already seeded)`
			);
			patientsSkipped++;

			if (patientDef.seq === HERO_DEMO_PATIENT_SEQ) {
				const heroVisit = rowsOf<{ id: number; visit_no: string }>(
					await db.execute(sql`
						SELECT pv.id, pv.visit_no
						FROM patient_visit pv
						INNER JOIN patient p ON p.id = pv.patient_id
						WHERE p.hospital_id = ${hospitalId}::uuid
						  AND p.code = ${patientDef.code}
						  AND pv.visit_no LIKE 'VH-%'
						ORDER BY pv.created_at DESC
						LIMIT 1
					`)
				);
				if (heroVisit[0]) {
					entryPoints.push({
						patientCode: patientDef.code,
						visitId: heroVisit[0].id,
						visitNo: heroVisit[0].visit_no
					});
				}
			}
			continue;
		}

		const patientId = await ensureDemoPatient(hospitalId, patientDef);
		let visitsCreated = 0;

		for (let vi = 0; vi < patientDef.visits.length; vi++) {
			const scenario = patientDef.visits[vi]!;
			const branch = branches[(patientDef.seq + vi) % branches.length]!;
			const doctor =
				doctors[(patientDef.seq + vi) % doctors.length]!;
			const visitNo = demoVisitNo(
				patientDef.seq,
				scenario.visitTypeCode,
				vi + 1
			);

			const existingVisit = rowsOf<{ id: number }>(
				await db.execute(sql`
					SELECT id FROM patient_visit
					WHERE hospital_id = ${hospitalId}::uuid
					  AND visit_no = ${visitNo}
					LIMIT 1
				`)
			);
			if (existingVisit[0]?.id) continue;

			const visitId = await insertVisit({
				patientId,
				hospitalId,
				branchId: branch.id,
				doctorId: doctor.id,
				visitNo,
				scenario
			});

			await seedClinicalForVisit({
				hospitalId,
				patientId,
				branchId: branch.id,
				doctorId: doctor.id,
				visitId,
				scenario,
				services,
				pharmacyItems,
				storeId,
				medMasters
			});

			visitsCreated++;

			if (
				patientDef.seq === HERO_DEMO_PATIENT_SEQ &&
				scenario.depth === 'full'
			) {
				entryPoints.push({
					patientCode: patientDef.code,
					visitId,
					visitNo
				});
			}
		}

		seedLogger.info(
			`Visit history demo [${patientDef.code}]: +${visitsCreated} visits with clinical data`
		);
		patientsSeeded++;
	}

	seedLogger.info(
		`Visit history demo complete: ${patientsSeeded} patients seeded, ${patientsSkipped} skipped`
	);

	for (const ep of entryPoints) {
		const path = `/medora/hospital/${hospitalId}/home/nursing-workbench/emr/patient-visit-history-dashboard?visitId=${ep.visitId}`;
		seedLogger.info(
			`Demo entry: ${ep.patientCode} visit ${ep.visitNo} (id=${ep.visitId}) → ${path}`
		);
	}

	if (entryPoints.length === 0) {
		seedLogger.warn(
			'No demo entry URL logged. Check that VH-DEMO-03 full visit exists or re-run after cleanup.'
		);
	}
}

seedVisitHistoryDemo()
	.then(() => {
		seedLogger.info('Visit history demo seeding finished');
		process.exit(0);
	})
	.catch((err) => {
		seedLogger.error(
			'Error while seeding visit history demo',
			err instanceof Error ? err : new Error(String(err))
		);
		process.exit(1);
	});
