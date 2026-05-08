import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, desc, ilike, ne, or, sql, eq } from 'drizzle-orm';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

const staffWithRelationsWith = {
	title: true,
	identityType: true,
	gender: true,
	maritalStatus: true,
	nationality: true,
	specialization: true,
	staffEmploymentType: true,
	staffType: true,
	status: true,
	phonePrimaryCountry: true,
	user: true
} as const;

/** Extra relations for registration view/edit (not loaded on paginated list). */
const staffByIdWithRelationsWith = {
	...staffWithRelationsWith,
	phoneSecondaryCountry: true,
	staffBranches: true,
	staffDepartments: true,
	staffUserGroups: true,
	staffDetail: { with: { bloodType: true, status: true } }
} as const;

/** Single-staff fetch (registration / delete preview); includes branches, groups, department, detail. */
export type StaffDetailWithRelations = NonNullable<
	Awaited<ReturnType<typeof getStaffByIdWithRelations>>
>;

/** Paginated list row (slimmer `with` than {@link getStaffByIdWithRelations}). */
export type StaffListRow = Omit<
	StaffDetailWithRelations,
	| 'staffBranches'
	| 'staffDepartments'
	| 'staffUserGroups'
	| 'staffDetail'
	| 'phoneSecondaryCountry'
>;

export async function getStaffListPaginated(
	event: RequestEvent,
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<NonNullable<StaffListRow>>> {
	const hospitalId = params.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);

	const { page, pageSize, limit, offset } = normalizePagination(params);
	const searchTerm = params.search?.trim();
	const staffCode = params.staffCode?.trim();
	const staffName = params.staffName?.trim();
	const staffPhonePrimary = params.staffPhonePrimary?.trim();

	const conditions = [ne(table.staffTable.statusId, StatusEnum.DELETED)];

	if (searchTerm) {
		const pattern = `%${searchTerm}%`;
		const orExpr = or(
			ilike(
				sql`concat_ws(' ', ${table.staffTable.firstName}, ${table.staffTable.middleName}, ${table.staffTable.lastName})`,
				pattern
			),
			ilike(table.staffTable.code, pattern),
			ilike(table.staffTable.phonePrimary, pattern)
		);
		if (orExpr) conditions.push(orExpr);
	}

	if (staffCode) {
		conditions.push(ilike(table.staffTable.code, `%${staffCode}%`));
	}
	if (staffName) {
		conditions.push(
			ilike(
				sql`concat_ws(' ', ${table.staffTable.firstName}, ${table.staffTable.middleName}, ${table.staffTable.lastName})`,
				`%${staffName}%`
			)
		);
	}
	if (staffPhonePrimary) {
		conditions.push(
			ilike(table.staffTable.phonePrimary, `%${staffPhonePrimary}%`)
		);
	}

	// Only staff assigned to this hospital (via staff_hospital).
	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${hospitalId})`;

	const whereExpr = and(and(...conditions), hospitalCondition);

	const [data, countResult] = await Promise.all([
		ensureDb().query.staffTable.findMany({
			where: whereExpr,
			with: staffWithRelationsWith,
			orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)],
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

export async function getStaffByIdWithRelations(
	event: RequestEvent,
	params: { hospitalId: string; id: string }
) {
	const hospitalId = params.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);
	if (!params.id) throw error(400, 'Staff id is required');

	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${hospitalId})`;

	return ensureDb().query.staffTable.findFirst({
		where: and(
			eq(table.staffTable.id, params.id),
			ne(table.staffTable.statusId, StatusEnum.DELETED),
			hospitalCondition
		),
		with: staffByIdWithRelationsWith
	});
}

export async function deleteStaff(
	event: RequestEvent,
	params: { hospitalId: string; id: string }
): Promise<void> {
	const hospitalId = params.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);
	if (!params.id) throw error(400, 'Staff id is required');

	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${hospitalId})`;

	await ensureDb()
		.update(table.staffTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(and(eq(table.staffTable.id, params.id), hospitalCondition));
}

/** Session bootstrap: staff row + relations for the logged-in user (any hospital). */
export async function getStaffByUserIdWithRelations(userId: string) {
	return ensureDb().query.staffTable.findFirst({
		where: (staffTable, { eq }) => eq(staffTable.userId, userId),
		with: {
			gender: true,
			identityType: true,
			maritalStatus: true,
			specialization: true,
			status: true,
			staffDetail: { with: { bloodType: true, status: true } },
			city: true,
			country: true,
			nationality: true,
			position: true,
			postalCode: true,
			staffEmploymentType: true,
			staffType: true,
			state: true,
			title: true,
			phonePrimaryCountry: true,
			user: true,
			staffBranches: { with: { branch: true } },
			staffHospitals: { with: { hospital: true } },
			staffDepartments: { with: { department: true } },
			staffUserGroups: { with: { userGroup: true } }
		}
	});
}

/** Current user may set status on their own staff row only (e.g. deactivate). */
export async function updateStaffStatusForSelf(
	event: RequestEvent,
	input: { staffId: string; statusId: number }
) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (event.locals.staff?.id !== input.staffId) {
		throw error(403, 'Can only update your own staff profile');
	}
	const [row] = await ensureDb()
		.update(table.staffTable)
		.set({ statusId: input.statusId })
		.where(eq(table.staffTable.id, input.staffId))
		.returning();
	if (!row) throw error(404, 'Staff not found');
	return row;
}

