import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	eq,
	ilike,
	inArray,
	ne,
	or,
	sql
} from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import type {
	AppointmentBlockSchema,
	AppointmentBlockSchemaInsert,
	AppointmentBlockSchemaUpdate,
	AppointmentSchema,
	AppointmentSchemaInsert,
	AppointmentSchemaUpdate,
	DoctorScheduleSchema
} from '$lib/server/db/schema-type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';

const doctorStaffWithRelationsWith = {
	title: true,
	specialization: true,
	staffDetail: true,
	status: true,
	user: true,
	staffBranches: { with: { branch: true } }
} as const;

export async function listDoctorStaff(
	event: RequestEvent,
	input: { hospitalId: string; branchId?: string }
) {
	await ensureCanAccessHospital(event, input.hospitalId);

	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${input.hospitalId})`;
	const baseCondition = and(
		eq(table.staffTable.staffTypeId, 3),
		ne(table.staffTable.statusId, StatusEnum.DELETED),
		hospitalCondition
	);
	const branchCondition =
		input.branchId != null && input.branchId !== ''
			? sql`${table.staffTable.id} IN (
				SELECT sb.staff_id
				FROM staff_branch sb
				INNER JOIN hospital_branch hb ON sb.branch_id = hb.id
				WHERE sb.branch_id = ${input.branchId}
				AND hb.hospital_id = ${input.hospitalId}
			)`
			: undefined;
	const whereCondition = branchCondition
		? and(baseCondition, branchCondition)
		: baseCondition;

	const doctorStaffIds = await ensureDb()
		.select({ id: table.staffTable.id })
		.from(table.staffTable)
		.where(whereCondition);

	const ids = doctorStaffIds.map((r) => r.id);
	if (ids.length === 0) return [];

	return ensureDb().query.staffTable.findMany({
		where: inArray(table.staffTable.id, ids),
		with: doctorStaffWithRelationsWith
	});
}

export async function getDoctorStaffPaginated(
	event: RequestEvent,
	params: PaginationParams & { hospitalId: string; branchId?: string }
): Promise<PaginatedResult<any>> {
	await ensureCanAccessHospital(event, params.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const searchTerm = params.search?.trim();
	const pattern = searchTerm ? `%${searchTerm}%` : null;
	const searchCondition =
		pattern &&
		or(
			ilike(
				sql`concat_ws(' ', ${table.staffTable.firstName}, ${table.staffTable.middleName}, ${table.staffTable.lastName})`,
				pattern
			),
			ilike(table.staffTable.code, pattern),
			ilike(table.staffTable.phonePrimary, pattern)
		);

	const notDeletedCondition = ne(
		table.staffTable.statusId,
		StatusEnum.DELETED
	);
	const doctorCondition = eq(table.staffTable.staffTypeId, 3);
	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${params.hospitalId})`;
	const branchCondition =
		params.branchId != null && params.branchId !== ''
			? sql`${table.staffTable.id} IN (
				SELECT sb.staff_id
				FROM staff_branch sb
				INNER JOIN hospital_branch hb ON sb.branch_id = hb.id
				WHERE sb.branch_id = ${params.branchId}
				AND hb.hospital_id = ${params.hospitalId}
			)`
			: undefined;

	let whereExpr = searchCondition
		? and(
				notDeletedCondition,
				doctorCondition,
				hospitalCondition,
				searchCondition
			)
		: and(notDeletedCondition, doctorCondition, hospitalCondition);
	if (branchCondition) whereExpr = and(whereExpr, branchCondition);

	const [data, countResult] = await Promise.all([
		ensureDb().query.staffTable.findMany({
			where: whereExpr,
			with: doctorStaffWithRelationsWith,
			limit,
			offset
		}),
		ensureDb()
			.select({ count: count() })
			.from(table.staffTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getDoctorByIdWithRelations(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	if (!input.id) throw error(400, 'Doctor id is required');
	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${input.hospitalId})`;
	return ensureDb().query.staffTable.findFirst({
		where: and(
			eq(table.staffTable.id, input.id),
			ne(table.staffTable.statusId, StatusEnum.DELETED),
			eq(table.staffTable.staffTypeId, 3),
			hospitalCondition
		),
		with: doctorStaffWithRelationsWith
	});
}

export async function listAppointments(
	event: RequestEvent,
	input: { hospitalId: string; branchId?: string }
): Promise<AppointmentSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const conditions = [
		eq(table.appointmentTable.hospitalId, input.hospitalId),
		ne(table.appointmentTable.statusId, StatusEnum.DELETED)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.appointmentTable.branchId, input.branchId)
		);
	}
	return ensureDb()
		.select()
		.from(table.appointmentTable)
		.where(and(...conditions));
}

export async function listAppointmentsWithRelations(
	event: RequestEvent,
	input: { hospitalId: string; branchId?: string }
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	const conditions = [
		eq(table.appointmentTable.hospitalId, input.hospitalId),
		ne(table.appointmentTable.statusId, StatusEnum.DELETED)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.appointmentTable.branchId, input.branchId)
		);
	}
	return ensureDb().query.appointmentTable.findMany({
		where: and(...conditions),
		with: {
			hospital: true,
			branch: true,
			patient: true,
			staff: true,
			patientTitle: true,
			referType: true,
			externalRefer: true,
			statusTagging: true,
			status: true
		}
	});
}

export async function getAppointmentById(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<AppointmentSchema | null> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [row] = await ensureDb()
		.select()
		.from(table.appointmentTable)
		.where(
			and(
				eq(table.appointmentTable.id, input.id),
				eq(table.appointmentTable.hospitalId, input.hospitalId),
				ne(table.appointmentTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createAppointment(
	event: RequestEvent,
	input: AppointmentSchemaInsert
): Promise<AppointmentSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [row] = await ensureDb()
		.insert(table.appointmentTable)
		.values(input)
		.returning();
	if (!row) throw new Error('Failed to create appointment');
	return row;
}

export async function updateAppointment(
	event: RequestEvent,
	input: AppointmentSchemaUpdate & { id: number; hospitalId: string }
): Promise<AppointmentSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const { id, hospitalId, ...rest } = input;
	if (!Number.isFinite(id) || id <= 0) {
		throw error(400, 'Invalid appointment id');
	}
	const [row] = await ensureDb()
		.update(table.appointmentTable)
		.set(rest)
		.where(
			and(
				eq(table.appointmentTable.id, id),
				eq(table.appointmentTable.hospitalId, hospitalId),
				ne(table.appointmentTable.statusId, StatusEnum.DELETED)
			)
		)
		.returning();
	if (!row) {
		throw error(
			404,
			'Appointment not found, was removed, or belongs to another hospital.'
		);
	}
	return row;
}

export async function deleteAppointment(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureDb()
		.update(table.appointmentTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.appointmentTable.id, input.id),
				eq(table.appointmentTable.hospitalId, input.hospitalId)
			)
		);
}

export async function getAppointmentCancelEligibility(
	event: RequestEvent,
	input: { hospitalId: string; appointmentId: number }
): Promise<{ allowed: true } | { allowed: false; message: string }> {
	await ensureCanAccessHospital(event, input.hospitalId);
	// Reuse existing safety checks: block cancellation if linked active visit has clinical records.
	// If this logic changes, keep it aligned with the mirrored `src/routes/api/**/appointment/**` handlers.
	const visits = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(
					table.patientVisitTable.appointmentId,
					input.appointmentId
				),
				eq(table.patientVisitTable.statusId, StatusEnum.ACTIVE)
			)
		);
	for (const { id } of visits) {
		// Inline import to avoid pulling heavy module into every request.
		const { visitHasBlockingClinicalData } =
			await import('$lib/server/visit-blocking-clinical.server');
		if (await visitHasBlockingClinicalData(id)) {
			return {
				allowed: false,
				message:
					'Cannot cancel: this visit has vitals, allergies, or other clinical records. Remove or resolve those first.'
			};
		}
	}
	return { allowed: true };
}

export async function listDoctorSchedules(
	event: RequestEvent,
	input: { hospitalId: string; branchId?: string }
): Promise<DoctorScheduleSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const conditions = [
		eq(table.doctorScheduleTable.hospitalId, input.hospitalId)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.doctorScheduleTable.branchId, input.branchId)
		);
	}
	return ensureDb()
		.select()
		.from(table.doctorScheduleTable)
		.where(and(...conditions));
}

export async function listAppointmentBlocks(
	event: RequestEvent,
	input: { hospitalId: string; staffId: string }
): Promise<AppointmentBlockSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);
	if (!input.staffId) throw error(400, 'staffId is required');
	return ensureDb()
		.select()
		.from(table.appointmentBlockTable)
		.where(
			and(
				eq(table.appointmentBlockTable.hospitalId, input.hospitalId),
				eq(table.appointmentBlockTable.staffId, input.staffId),
				ne(table.appointmentBlockTable.statusId, StatusEnum.DELETED)
			)
		);
}

export async function createAppointmentBlock(
	event: RequestEvent,
	input: AppointmentBlockSchemaInsert & { hospitalId: string }
): Promise<AppointmentBlockSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [row] = await ensureDb()
		.insert(table.appointmentBlockTable)
		.values(input)
		.returning();
	if (!row) throw new Error('Failed to create block');
	return row;
}

export async function updateAppointmentBlock(
	event: RequestEvent,
	input: AppointmentBlockSchemaUpdate & {
		id: number;
		hospitalId: string;
	}
): Promise<AppointmentBlockSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const { id, hospitalId, ...rest } = input;
	const [row] = await ensureDb()
		.update(table.appointmentBlockTable)
		.set(rest)
		.where(
			and(
				eq(table.appointmentBlockTable.id, id),
				eq(table.appointmentBlockTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Failed to update block');
	return row;
}

export async function deleteAppointmentBlock(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureDb()
		.update(table.appointmentBlockTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.appointmentBlockTable.id, input.id),
				eq(table.appointmentBlockTable.hospitalId, input.hospitalId)
			)
		);
}

export async function listTitles(event: RequestEvent) {
	// Titles are master data; no hospital scoping currently.
	void event;
	return ensureDb().select().from(table.titleTable);
}

export async function listReferTypes(event: RequestEvent) {
	void event;
	return ensureDb().select().from(table.referTypeTable);
}

export async function listStatusTaggings(event: RequestEvent) {
	void event;
	return ensureDb().select().from(table.statusTaggingTable);
}

export async function listExternalRefers(
	event: RequestEvent,
	input: { hospitalId: string }
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	return ensureDb()
		.select()
		.from(table.externalReferTable)
		.where(
			and(
				eq(table.externalReferTable.hospitalId, input.hospitalId),
				ne(table.externalReferTable.statusId, StatusEnum.DELETED)
			)
		);
}
