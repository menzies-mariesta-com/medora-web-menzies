import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffSchema, StaffSchemaInsert, StaffSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq, or, ilike, ne, and } from 'drizzle-orm';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { createStaffDetail } from './staff-detail.remote';
import { createStaffDepartment } from './staff-department.remote';
import { createStaffUserGroup } from './staff-user-group.remote';
import { uuidv7 } from 'uuidv7';
import { userTable, accountTable } from '$lib/server/db/table/auth-table/auth-table';

// Reusable type for a single staff row with all relations
export type StaffWithRelations = NonNullable<
	Awaited<ReturnType<typeof getStaffByIdWithRelations>>
>;

// get all (no relations)
export const getStaff = query(async (): Promise<StaffSchema[]> => {
	const data = await ensureDb().select().from(table.staffTable);
	return data;
});

// get all with many-to-many relations and master lookups (no pagination)
export const getStaffWithRelations = query(async () => {
	return ensureDb().query.staffTable.findMany({
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
			user: true,
			staffHospitals: { with: { hospital: true } },
			staffDepartments: { with: { department: true } },
			staffUserGroups: { with: { userGroup: true } },
		},
	});
});

// get one with relations
export const getStaffByUserIdWithRelations = query(
	'unchecked' as const,
	async ({ userId }: { userId: string }) => {
		return ensureDb().query.staffTable.findFirst({
			where: (staffTable, funcs) => funcs.eq(staffTable.userId, userId),
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
				user: true,
				staffHospitals: { with: { hospital: true } },
				staffDepartments: { with: { department: true } },
				staffUserGroups: { with: { userGroup: true } },
			},
		});
	}
);

// get count
export const getStaffCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.staffTable);
	return row?.count ?? 0;
});

// get paginated with relations (optional search on firstName, lastName, code, phonePrimary)
export const getStaffPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<StaffWithRelations>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const searchTerm = params?.search?.trim();
		const pattern = searchTerm ? `%${searchTerm}%` : null;
		const searchCondition =
			pattern &&
			or(
				ilike(table.staffTable.firstName, pattern),
				ilike(table.staffTable.lastName, pattern),
				ilike(table.staffTable.code, pattern),
				ilike(table.staffTable.phonePrimary, pattern)
			);

		// Exclude soft-deleted staff
		const notDeletedCondition = ne(table.staffTable.statusId, StatusEnum.DELETED);

		const whereExpr = searchCondition
			? and(notDeletedCondition, searchCondition)
			: notDeletedCondition;

		const [data, countResult] = await Promise.all([
			ensureDb().query.staffTable.findMany({
				where: whereExpr,
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
					user: true,
					staffHospitals: { with: { hospital: true } },
					staffDepartments: { with: { department: true } },
					staffUserGroups: { with: { userGroup: true } },
				},
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
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get one
export const getStaffById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<StaffSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffTable)
			.where(eq(table.staffTable.id, id));
		return row ?? null;
	}
);

// get one with relations (for view/edit form)
export const getStaffByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: string }) => {
		return ensureDb().query.staffTable.findFirst({
			where: (staffTable, funcs) => funcs.eq(staffTable.id, id),
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
				user: true,
				staffHospitals: { with: { hospital: true } },
				staffDepartments: { with: { department: true } },
				staffUserGroups: { with: { userGroup: true } },
			},
		});
	}
);

export const getStaffByUserId = query(
	'unchecked' as const,
	async ({ userId }: { userId: string }): Promise<StaffSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffTable)
			.where(eq(table.staffTable.userId, userId));
		return row ?? null;
	}
);

// create with uniqueness check on userId (1:1 with Better Auth user)
export const createStaff = command(
	'unchecked' as const,
	async (payload: StaffSchemaInsert): Promise<StaffSchema> => {
		// Ensure userId is present and non-null for the 1:1 link
		if (!payload.userId) {
			throw new Error('userId is required to create staff profile');
		}

		// Enforce 1:1 constraint: a user can only have one staff profile
		const existing = await getStaffByUserId({ userId: payload.userId });
		if (existing) {
			throw new Error('Staff profile already exists');
		}

		const [row] = await ensureDb()
			.insert(table.staffTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaff().refresh();
		return row;
	}
);

// update
export const updateStaff = command(
	'unchecked' as const,
	async (payload: { id: string } & StaffSchemaUpdate): Promise<StaffSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.staffTable)
			.set(rest as StaffSchemaUpdate)
			.where(eq(table.staffTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaff().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStaff = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb()
			.update(table.staffTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffTable.id, id));
		getStaff().refresh();
	}
);

// delete complete (hard)
export const deleteStaffComplete = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb().delete(table.staffTable).where(eq(table.staffTable.id, id));
		getStaff().refresh();
	}
);

// Generate random password
function generateRandomPassword(length: number = 16): string {
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return password;
}

// Create staff with user (Better Auth)
export const createStaffWithUser = command(
	'unchecked' as const,
	async (payload: {
		// User fields
		email: string;
		name: string;
		// Staff fields (only include fields that exist in staffTable)
		code?: string;
		firstName?: string;
		middleName?: string;
		lastName?: string;
		phonePrimary?: string;
		phoneSecondary?: string;
		phonePrimaryCountryId?: number;
		phoneSecondaryCountryId?: number;
		dateOfBirth?: string;
		address?: string;
		remark?: string;
		identityNo?: string;
		titleId?: number;
		genderId?: number;
		maritalStatusId?: number;
		staffEmploymentTypeId?: number;
		staffTypeId?: number;
		education?: string;
		designation?: string;
		departmentId?: number;
		specializationId?: number;
		countryId?: number;
		stateId?: number;
		cityId?: number;
		postalCodeId?: number;
		identityTypeId?: number;
		joinDate?: string;
		resignDate?: string;
		isActive?: boolean;
		isSuperAdmin?: boolean;
		isLocked?: boolean;
		userGroupIds?: number[];
		photoUrl?: string;
		licenseNo?: string;
		licenseExpiryDate?: string;
		signatureImageUrl?: string;
		signatureText?: string;
	}): Promise<{ staff: StaffSchema; userId: string; generatedPassword: string }> => {
		const passwordHashUtil = new PasswordHashUtil();

		// Check if email already exists
		const existingUser = await ensureDb()
			.select()
			.from(userTable)
			.where(eq(userTable.email, payload.email))
			.limit(1);
		if (existingUser.length > 0) {
			// Use SvelteKit HttpError so the message survives serialization
			throw error(400, 'Staff with this email already exists');
		}

		// Generate random password
		const generatedPassword = generateRandomPassword(16);
		const hashedPassword = await passwordHashUtil.hash(generatedPassword);

		// Create user
		const userId = uuidv7();
		const [user] = await ensureDb()
			.insert(userTable)
			.values({
				id: userId,
				name: payload.name,
				email: payload.email,
				emailVerified: false
			})
			.returning();

		if (!user) throw error(400, 'Failed to create staff.');

		// Create account for Better Auth email/password
		await ensureDb().insert(accountTable).values({
			id: uuidv7(),
			userId: user.id,
			accountId: payload.email,
			providerId: 'credential',
			password: hashedPassword
		});

		// Create staff detail if any detail field provided
		const hasDetail =
			payload.education ||
			payload.designation ||
			payload.licenseNo ||
			payload.licenseExpiryDate ||
			payload.signatureImageUrl ||
			payload.signatureText;
		let staffDetailId: number | undefined;
		if (hasDetail) {
			const staffDetail = await createStaffDetail({
				education: payload.education,
				designation: payload.designation,
				licenseNo: payload.licenseNo,
				licenseExpiryDate: payload.licenseExpiryDate
					? new Date(payload.licenseExpiryDate).toISOString().split('T')[0]
					: undefined,
				signatureImageUrl: payload.signatureImageUrl,
				signatureText: payload.signatureText
			});
			staffDetailId = staffDetail.id;
		}

		// Prepare staff payload (only include fields that exist in staffTable)
		const staffPayload: StaffSchemaInsert = {
			userId: user.id,
			firstName: payload.firstName,
			middleName: payload.middleName,
			lastName: payload.lastName,
			phonePrimary: payload.phonePrimary,
			phoneSecondary: payload.phoneSecondary,
			phonePrimaryCountryId: payload.phonePrimaryCountryId ? Number(payload.phonePrimaryCountryId) : undefined,
			phoneSecondaryCountryId: payload.phoneSecondaryCountryId ? Number(payload.phoneSecondaryCountryId) : undefined,
			dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth).toISOString().split('T')[0] : undefined,
			photoUrl: payload.photoUrl ?? undefined,
			address: payload.address,
			remark: payload.remark,
			identityNo: payload.identityNo,
			titleId: payload.titleId ? Number(payload.titleId) : undefined,
			genderId: payload.genderId ? Number(payload.genderId) : undefined,
			maritalStatusId: payload.maritalStatusId ? Number(payload.maritalStatusId) : undefined,
			staffEmploymentTypeId: payload.staffEmploymentTypeId ? Number(payload.staffEmploymentTypeId) : undefined,
			staffTypeId: payload.staffTypeId ? Number(payload.staffTypeId) : undefined,
			staffDetailId,
			cityId: payload.cityId ? Number(payload.cityId) : undefined,
			stateId: payload.stateId ? Number(payload.stateId) : undefined,
			countryId: payload.countryId ? Number(payload.countryId) : undefined,
			postalCodeId: payload.postalCodeId ? Number(payload.postalCodeId) : undefined,
			identityTypeId: payload.identityTypeId ? Number(payload.identityTypeId) : undefined,
			specializationId: payload.specializationId ? Number(payload.specializationId) : undefined,
			statusId: payload.isActive === false ? StatusEnum.INACTIVE : StatusEnum.ACTIVE
		};

		// Create staff
		const staff = await createStaff(staffPayload);

		// Create staff departments
		if (payload.departmentId) {
			await createStaffDepartment({
				staffId: staff.id,
				departmentId: Number(payload.departmentId)
			});
		}

		// Create staff user groups
		if (payload.userGroupIds && payload.userGroupIds.length > 0) {
			for (const userGroupId of payload.userGroupIds) {
				await createStaffUserGroup({
					staffId: staff.id,
					userGroupId: Number(userGroupId)
				});
			}
		}

		return { staff, userId: user.id, generatedPassword };
	}
);
