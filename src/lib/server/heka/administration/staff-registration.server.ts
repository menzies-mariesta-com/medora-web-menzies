import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import type {
	BloodTypeSchema,
	CitySchema,
	CountrySchema,
	DepartmentSchema,
	GenderSchema,
	HospitalBranchSchema,
	IdentityTypeSchema,
	MaritalStatusSchema,
	NationalitySchema,
	PostalCodeSchema,
	StaffEmploymentTypeSchema,
	StaffSchema,
	StaffTypeSchema,
	StateSchema,
	TitleSchema,
	UserGroupSchema
} from '$lib/server/db/schema-type';
import type { SpecializationWithRelations } from '$lib/model/type/specialization-with-relations.type';

type StaffDetailUpsertInput = {
	education?: string;
	designation?: string;
	bloodTypeId?: number;
	licenseNo?: string;
	licenseExpiryDate?: string;
	signatureImageUrl?: string | null;
	signatureText?: string;
};

type CreateStaffRegistrationInput = {
	hospitalId: string;
	email: string;
	name: string;
	code?: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	phonePrimary?: string;
	phoneSecondary?: string;
	phonePrimaryCountryId?: number;
	phoneSecondaryCountryId?: number;
	dateOfBirth?: string;
	joinDate?: string;
	resignDate?: string;
	address?: string;
	remark?: string;
	identityNo?: string;
	titleId?: number;
	genderId?: number;
	maritalStatusId?: number;
	staffEmploymentTypeId?: number;
	staffTypeId?: number;
	departmentId?: number;
	specializationId?: number;
	countryId?: number;
	stateId?: number;
	cityId?: number;
	postalCodeId?: number;
	nationalityId?: number;
	identityTypeId?: number;
	statusId?: number;
	photoUrl?: string | null;
	isSuperAdmin?: boolean;
	isLocked?: boolean;
	userGroupIds?: number[];
	branchIds?: string[];
	staffDetail?: StaffDetailUpsertInput;
};

type UpdateStaffRegistrationInput = {
	hospitalId: string;
	id: string;
	user?: { id: string; email?: string; name?: string };
	staff: Partial<
		Omit<
			StaffSchema,
			'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'
		>
	> & { statusId?: number };
	departmentId?: number | null;
	userGroupIds?: number[];
	branchIds?: string[];
	staffDetail?: StaffDetailUpsertInput | null;
};

async function ensureCanRegisterStaff(
	event: RequestEvent,
	hospitalId: string
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	const roleId = event.locals.userRoleId ?? null;
	if (
		roleId !== RoleEnum.OWNER &&
		roleId !== RoleEnum.SYSTEM_ADMIN &&
		roleId !== RoleEnum.STAFF
	) {
		throw error(
			403,
			'Only owner, system admin, or staff can register staff'
		);
	}
}

function toDateOnlyString(input?: string): string | undefined {
	if (!input) return undefined;
	return new Date(input).toISOString().split('T')[0];
}

function generateRandomPassword(length: number = 16): string {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return password;
}

export async function getStaffRegistrationLookups(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<{
	titleData: TitleSchema[];
	staffTypeData: StaffTypeSchema[];
	departmentData: DepartmentSchema[];
	branchData: HospitalBranchSchema[];
	specializationData: SpecializationWithRelations[];
	genderData: GenderSchema[];
	maritalStatusData: MaritalStatusSchema[];
	countryData: CountrySchema[];
	bloodTypeData: BloodTypeSchema[];
	identityTypeData: IdentityTypeSchema[];
	userGroupData: UserGroupSchema[];
	staffEmploymentTypeData: StaffEmploymentTypeSchema[];
	stateData: StateSchema[];
	cityData: CitySchema[];
	postalCodeData: PostalCodeSchema[];
	nationalityData: NationalitySchema[];
}> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const notDeleted = (t: { statusId: unknown }) =>
		ne(t.statusId as never, StatusEnum.DELETED);

	const [
		titleData,
		staffTypeData,
		departmentData,
		specializationData,
		genderData,
		maritalStatusData,
		countryData,
		identityTypeData,
		userGroupData,
		staffEmploymentTypeData,
		stateData,
		cityData,
		postalCodeData,
		bloodTypeData,
		nationalityData,
		branchData
	] = await Promise.all([
		ensureDb()
			.select()
			.from(table.titleTable)
			.where(notDeleted(table.titleTable))
			.orderBy(table.titleTable.name),
		ensureDb()
			.select()
			.from(table.staffTypeTable)
			.where(notDeleted(table.staffTypeTable))
			.orderBy(table.staffTypeTable.name),
		ensureDb()
			.select()
			.from(table.departmentTable)
			.where(notDeleted(table.departmentTable))
			.orderBy(table.departmentTable.name),
		ensureDb().query.specializationTable.findMany({
			where: (t, { ne }) => ne(t.statusId, StatusEnum.DELETED),
			with: { craftGroup: true, status: true },
			orderBy: [asc(table.specializationTable.name)]
		}),
		ensureDb()
			.select()
			.from(table.genderTable)
			.where(notDeleted(table.genderTable))
			.orderBy(table.genderTable.name),
		ensureDb()
			.select()
			.from(table.maritalStatusTable)
			.where(notDeleted(table.maritalStatusTable))
			.orderBy(table.maritalStatusTable.name),
		ensureDb()
			.select()
			.from(table.countryTable)
			.where(notDeleted(table.countryTable))
			.orderBy(table.countryTable.name),
		ensureDb()
			.select()
			.from(table.identityTypeTable)
			.where(notDeleted(table.identityTypeTable))
			.orderBy(table.identityTypeTable.name),
		ensureDb()
			.select()
			.from(table.userGroupTable)
			.where(
				and(
					eq(table.userGroupTable.hospitalId, input.hospitalId),
					ne(table.userGroupTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(table.userGroupTable.name),
		ensureDb()
			.select()
			.from(table.staffEmploymentTypeTable)
			.where(notDeleted(table.staffEmploymentTypeTable))
			.orderBy(table.staffEmploymentTypeTable.name),
		ensureDb()
			.select()
			.from(table.stateTable)
			.where(notDeleted(table.stateTable))
			.orderBy(table.stateTable.name),
		ensureDb()
			.select()
			.from(table.cityTable)
			.where(notDeleted(table.cityTable))
			.orderBy(table.cityTable.name),
		ensureDb()
			.select()
			.from(table.postalCodeTable)
			.where(notDeleted(table.postalCodeTable))
			.orderBy(table.postalCodeTable.value),
		ensureDb()
			.select()
			.from(table.bloodTypeTable)
			.where(notDeleted(table.bloodTypeTable))
			.orderBy(table.bloodTypeTable.name),
		ensureDb()
			.select()
			.from(table.nationalityTable)
			.where(notDeleted(table.nationalityTable))
			.orderBy(table.nationalityTable.name),
		ensureDb()
			.select()
			.from(table.hospitalBranchTable)
			.where(
				and(
					eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
					eq(table.hospitalBranchTable.statusId, StatusEnum.ACTIVE)
				)
			)
			.orderBy(table.hospitalBranchTable.name)
	]);

	return {
		titleData,
		staffTypeData,
		departmentData,
		branchData,
		specializationData: specializationData as SpecializationWithRelations[],
		genderData,
		maritalStatusData,
		countryData,
		bloodTypeData,
		identityTypeData,
		userGroupData,
		staffEmploymentTypeData,
		stateData,
		cityData,
		postalCodeData,
		nationalityData
	};
}

async function upsertStaffDetail(
	tx: ReturnType<typeof ensureDb>,
	input:
		| { id: number; patch: StaffDetailUpsertInput }
		| { id?: undefined; patch: StaffDetailUpsertInput }
): Promise<number | undefined> {
	const hasAny =
		!!input.patch.education ||
		!!input.patch.designation ||
		!!input.patch.licenseNo ||
		!!input.patch.licenseExpiryDate ||
		input.patch.signatureImageUrl != null ||
		!!input.patch.signatureText ||
		typeof input.patch.bloodTypeId === 'number';

	if (!hasAny && !input.id) return undefined;

	const payload = {
		education: input.patch.education || undefined,
		designation: input.patch.designation || undefined,
		licenseNo: input.patch.licenseNo || undefined,
		licenseExpiryDate: toDateOnlyString(input.patch.licenseExpiryDate),
		signatureImageUrl:
			input.patch.signatureImageUrl === null
				? null
				: input.patch.signatureImageUrl || undefined,
		signatureText: input.patch.signatureText || undefined,
		bloodTypeId:
			typeof input.patch.bloodTypeId === 'number'
				? input.patch.bloodTypeId
				: undefined
	};

	if (input.id) {
		await tx
			.update(table.staffDetailTable)
			.set(payload)
			.where(eq(table.staffDetailTable.id, input.id));
		return input.id;
	}

	const [created] = await tx
		.insert(table.staffDetailTable)
		.values(payload)
		.returning({ id: table.staffDetailTable.id });
	return created?.id;
}

export async function createStaffRegistration(
	event: RequestEvent,
	input: CreateStaffRegistrationInput
): Promise<{ staff: StaffSchema; userId: string; generatedPassword: string }> {
	await ensureCanRegisterStaff(event, input.hospitalId);
	const passwordHashUtil = new PasswordHashUtil();

	const trimmedEmail = input.email.trim();
	if (!trimmedEmail) throw error(400, 'Email is required');

	const existing = await ensureDb()
		.select({ id: table.userTable.id })
		.from(table.userTable)
		.where(eq(table.userTable.email, trimmedEmail))
		.limit(1);
	if (existing.length > 0) throw error(400, 'Staff with this email already exists');

	const generatedPassword = generateRandomPassword(16);
	const hashedPassword = await passwordHashUtil.hash(generatedPassword);

	const userId = uuidv7();

	const created = await ensureDb().transaction(async (tx) => {
		const [user] = await tx
			.insert(table.userTable)
			.values({
				id: userId,
				name: input.name,
				email: trimmedEmail,
				emailVerified: false,
				roleId: RoleEnum.STAFF
			})
			.returning();
		if (!user) throw error(400, 'Failed to create staff.');

		await tx.insert(table.accountTable).values({
			id: uuidv7(),
			userId: user.id,
			accountId: trimmedEmail,
			providerId: 'credential',
			password: hashedPassword
		});

		const staffDetailId = input.staffDetail
			? await upsertStaffDetail(tx as unknown as ReturnType<typeof ensureDb>, {
					patch: input.staffDetail
				})
			: undefined;

		const effectiveStatusId = input.statusId ?? StatusEnum.ACTIVE;

		const [staff] = await tx
			.insert(table.staffTable)
			.values({
				userId: user.id,
				code: input.code || undefined,
				firstName: input.firstName || undefined,
				middleName: input.middleName || undefined,
				lastName: input.lastName || undefined,
				phonePrimary: input.phonePrimary || undefined,
				phoneSecondary: input.phoneSecondary || undefined,
				phonePrimaryCountryId: input.phonePrimaryCountryId ?? undefined,
				phoneSecondaryCountryId: input.phoneSecondaryCountryId ?? undefined,
				dateOfBirth: toDateOnlyString(input.dateOfBirth),
				joinDate: toDateOnlyString(input.joinDate),
				resignDate: toDateOnlyString(input.resignDate),
				photoUrl: input.photoUrl ?? undefined,
				address: input.address || undefined,
				remark: input.remark || undefined,
				identityNo: input.identityNo || undefined,
				titleId: input.titleId ?? undefined,
				genderId: input.genderId ?? undefined,
				maritalStatusId: input.maritalStatusId ?? undefined,
				staffEmploymentTypeId: input.staffEmploymentTypeId ?? undefined,
				staffTypeId: input.staffTypeId ?? undefined,
				staffDetailId: staffDetailId ?? undefined,
				countryId: input.countryId ?? undefined,
				stateId: input.stateId ?? undefined,
				cityId: input.cityId ?? undefined,
				postalCodeId: input.postalCodeId ?? undefined,
				nationalityId: input.nationalityId ?? undefined,
				identityTypeId: input.identityTypeId ?? undefined,
				specializationId: input.specializationId ?? undefined,
				statusId: effectiveStatusId
			})
			.returning();
		if (!staff) throw error(400, 'Failed to create staff.');

		if (typeof input.departmentId === 'number') {
			await tx.insert(table.staffDepartmentTable).values({
				staffId: staff.id,
				departmentId: input.departmentId
			});
		}

		const uniqueUserGroupIds = [...new Set(input.userGroupIds ?? [])].filter(
			(n) => Number.isFinite(n)
		);
		if (uniqueUserGroupIds.length > 0) {
			const groups = await tx
				.select({ id: table.userGroupTable.id })
				.from(table.userGroupTable)
				.where(
					and(
						eq(table.userGroupTable.hospitalId, input.hospitalId),
						inArray(table.userGroupTable.id, uniqueUserGroupIds),
						ne(table.userGroupTable.statusId, StatusEnum.DELETED)
					)
				);
			if (groups.length > 0) {
				await tx.insert(table.staffUserGroupTable).values(
					groups.map((g) => ({
						staffId: staff.id,
						userGroupId: g.id
					}))
				);
			}
		}

		await tx.insert(table.staffHospitalTable).values({
			staffId: staff.id,
			hospitalId: input.hospitalId
		});

		const uniqueBranchIds = [...new Set(input.branchIds ?? [])].filter(Boolean);
		if (uniqueBranchIds.length > 0) {
			const branches = await tx
				.select({ id: table.hospitalBranchTable.id })
				.from(table.hospitalBranchTable)
				.where(
					and(
						eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
						inArray(table.hospitalBranchTable.id, uniqueBranchIds),
						eq(table.hospitalBranchTable.statusId, StatusEnum.ACTIVE)
					)
				);
			if (branches.length > 0) {
				await tx.insert(table.staffBranchTable).values(
					branches.map((b) => ({
						staffId: staff.id,
						branchId: b.id
					}))
				);
			}
		}

		return staff;
	});

	return { staff: created, userId, generatedPassword };
}

export async function updateStaffRegistration(
	event: RequestEvent,
	input: UpdateStaffRegistrationInput
): Promise<{ ok: true; staffId: string; staffDetailId?: number }> {
	await ensureCanRegisterStaff(event, input.hospitalId);
	if (!input.id) throw error(400, 'Staff id is required');

	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${input.hospitalId})`;

	return ensureDb().transaction(async (tx) => {
		// Validate staff exists & belongs to hospital
		const existing = await tx.query.staffTable.findFirst({
			where: and(
				eq(table.staffTable.id, input.id),
				ne(table.staffTable.statusId, StatusEnum.DELETED),
				hospitalCondition
			),
			with: { user: true }
		});
		if (!existing) throw error(404, 'Staff not found');

		// Update user (name/email) when requested
		if (input.user?.id) {
			const nextName = input.user.name?.trim();
			const nextEmail = input.user.email?.trim();

			if (nextEmail && nextEmail !== existing.user?.email) {
				const dup = await tx
					.select({ id: table.userTable.id })
					.from(table.userTable)
					.where(eq(table.userTable.email, nextEmail))
					.limit(1);
				if (dup.length > 0)
					throw error(400, 'Staff with this email already exists');
			}

			const userPatch: Partial<{
				name: string;
				email: string;
			}> = {};
			if (nextName && nextName !== (existing.user?.name ?? '')) {
				userPatch.name = nextName;
			}
			if (nextEmail && nextEmail !== (existing.user?.email ?? '')) {
				userPatch.email = nextEmail;
			}
			if (Object.keys(userPatch).length > 0) {
				await tx
					.update(table.userTable)
					.set(userPatch)
					.where(eq(table.userTable.id, input.user.id));
			}
		}

		let staffDetailId = existing.staffDetailId ?? undefined;
		if (input.staffDetail) {
			staffDetailId = await upsertStaffDetail(
				tx as unknown as ReturnType<typeof ensureDb>,
				{
					id: existing.staffDetailId ?? undefined,
					patch: input.staffDetail
				}
			);
		} else if (input.staffDetail === null && existing.staffDetailId) {
			// keep the row, but allow clearing signature image explicitly through patch
		}

		const staffPatch = { ...input.staff };
		if (typeof staffPatch.dateOfBirth === 'string') {
			staffPatch.dateOfBirth = toDateOnlyString(staffPatch.dateOfBirth);
		}
		if (typeof staffPatch.joinDate === 'string') {
			staffPatch.joinDate = toDateOnlyString(staffPatch.joinDate);
		}
		if (typeof staffPatch.resignDate === 'string') {
			staffPatch.resignDate = toDateOnlyString(staffPatch.resignDate);
		}
		if (staffDetailId && staffPatch.staffDetailId == null) {
			staffPatch.staffDetailId = staffDetailId;
		}

		await tx
			.update(table.staffTable)
			.set(staffPatch)
			.where(and(eq(table.staffTable.id, input.id), hospitalCondition));

		// Department: replace all
		if (input.departmentId !== undefined) {
			await tx
				.delete(table.staffDepartmentTable)
				.where(eq(table.staffDepartmentTable.staffId, input.id));
			if (input.departmentId != null) {
				await tx.insert(table.staffDepartmentTable).values({
					staffId: input.id,
					departmentId: input.departmentId
				});
			}
		}

		// User groups: only those belonging to this hospital
		if (input.userGroupIds) {
			const existingSug = await tx
				.select({
					id: table.staffUserGroupTable.id,
					userGroupId: table.staffUserGroupTable.userGroupId
				})
				.from(table.staffUserGroupTable)
				.innerJoin(
					table.userGroupTable,
					eq(table.userGroupTable.id, table.staffUserGroupTable.userGroupId)
				)
				.where(
					and(
						eq(table.staffUserGroupTable.staffId, input.id),
						eq(table.userGroupTable.hospitalId, input.hospitalId)
					)
				);
			if (existingSug.length > 0) {
				await tx
					.delete(table.staffUserGroupTable)
					.where(
						inArray(
							table.staffUserGroupTable.id,
							existingSug.map((r) => r.id)
						)
					);
			}
			const uniqueIds = [...new Set(input.userGroupIds)].filter((n) =>
				Number.isFinite(n)
			);
			if (uniqueIds.length > 0) {
				const groups = await tx
					.select({ id: table.userGroupTable.id })
					.from(table.userGroupTable)
					.where(
						and(
							eq(table.userGroupTable.hospitalId, input.hospitalId),
							inArray(table.userGroupTable.id, uniqueIds),
							ne(table.userGroupTable.statusId, StatusEnum.DELETED)
						)
					);
				if (groups.length > 0) {
					await tx.insert(table.staffUserGroupTable).values(
						groups.map((g) => ({
							staffId: input.id,
							userGroupId: g.id
						}))
					);
				}
			}
		}

		// Branches: only those under this hospital
		if (input.branchIds) {
			const existingSb = await tx
				.select({ id: table.staffBranchTable.id })
				.from(table.staffBranchTable)
				.innerJoin(
					table.hospitalBranchTable,
					eq(table.hospitalBranchTable.id, table.staffBranchTable.branchId)
				)
				.where(
					and(
						eq(table.staffBranchTable.staffId, input.id),
						eq(table.hospitalBranchTable.hospitalId, input.hospitalId)
					)
				);
			if (existingSb.length > 0) {
				await tx
					.delete(table.staffBranchTable)
					.where(
						inArray(
							table.staffBranchTable.id,
							existingSb.map((r) => r.id)
						)
					);
			}
			const uniqueBranchIds = [...new Set(input.branchIds)].filter(Boolean);
			if (uniqueBranchIds.length > 0) {
				const branches = await tx
					.select({ id: table.hospitalBranchTable.id })
					.from(table.hospitalBranchTable)
					.where(
						and(
							eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
							inArray(table.hospitalBranchTable.id, uniqueBranchIds),
							eq(table.hospitalBranchTable.statusId, StatusEnum.ACTIVE)
						)
					);
				if (branches.length > 0) {
					await tx.insert(table.staffBranchTable).values(
						branches.map((b) => ({
							staffId: input.id,
							branchId: b.id
						}))
					);
				}
			}
		}

		return { ok: true, staffId: input.id, staffDetailId };
	});
}

