import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientSchema,
	PatientSchemaInsert,
	PatientSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { uuidv7 } from 'uuidv7';
import { userTable, accountTable } from '$lib/server/db/table/auth-table/auth-table';



export type PatientWithRelations = NonNullable<
	Awaited<ReturnType<typeof getPatientByIdWithRelations>>
>;

// get all
export const getPatient = query(async (): Promise<PatientSchema[]> => {
	const data = await ensureDb().select().from(table.patientTable);
	return data;
});

// get all with relations
export const getPatientWithRelations = query(async () => {
	return ensureDb().query.patientTable.findMany({
		with: {
			user: true,
			maritalStatus: true,
			gender: true,
			identityType: true,
			bloodType: true,
			city: true,
			state: true,
			country: true,
			status: true,
			attachments: true,
			insurances: { with: { insurance: true } },
			allergies: true,
		},
	});
});

// get count
export const getPatientCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.patientTable);
	return row?.count ?? 0;
});

// get paginated with relations (optional search on firstName, lastName, code, phonePrimary)
export const getPatientPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<PatientWithRelations>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const searchTerm = params?.search?.trim();
		const pattern = searchTerm ? `%${searchTerm}%` : null;
		const searchCondition =
			pattern &&
			or(
				ilike(table.patientTable.firstName, pattern),
				ilike(table.patientTable.lastName, pattern),
				ilike(table.patientTable.code, pattern),
				ilike(table.patientTable.phonePrimary, pattern)
			);

		const notDeletedCondition = ne(table.patientTable.statusId, StatusEnum.DELETED);
		const whereExpr = searchCondition
			? and(notDeletedCondition, searchCondition)
			: notDeletedCondition;

		const [data, countResult] = await Promise.all([
			ensureDb().query.patientTable.findMany({
				where: whereExpr,
				with: {
					user: true,
					title: true,
					religion: true,
					maritalStatus: true,
					gender: true,
					identityType: true,
					bloodType: true,
					city: true,
					state: true,
					country: true,
					status: true,
					attachments: true,
					insurances: { with: { insurance: true } },
					allergies: true,
				},
				limit,
				offset
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.patientTable)
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

// Find potential duplicate patients using multiple criteria.
// For any field that is filled in the form (name, father name, primary phone, identity),
// that field becomes a REQUIRED filter (combined with AND).
// Matching uses ILIKE for strings and excludes DELETED rows.
// Optionally exclude a patient id (e.g. when editing).
export const getDuplicatePatients = query(
	'unchecked' as const,
	async (params: {
		titleId: number | null;
		firstName: string;
		middleName: string;
		lastName: string;
		fatherTitleId: number | null;
		fatherName: string;
		phonePrimary: string;
		identityTypeId: number | null;
		identityNo: string;
		excludePatientId?: string | null;
	}): Promise<PatientWithRelations[]> => {
		const conditions = [
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		];

		if (params.excludePatientId?.trim()) {
			conditions.push(
				ne(table.patientTable.id, params.excludePatientId.trim())
			);
		}

		const firstNameTrim = params.firstName.trim();
		const middleNameTrim = (params.middleName ?? '').trim();
		const lastNameTrim = (params.lastName ?? '').trim();
		const fatherNameTrim = (params.fatherName ?? '').trim();
		const phonePrimaryTrim = (params.phonePrimary ?? '').trim();
		const identityNoTrim = (params.identityNo ?? '').trim();

		// Full name: title + first + middle + last (using name parts only here)
		const fullNameSearch = [firstNameTrim, middleNameTrim, lastNameTrim]
			.filter(Boolean)
			.join(' ')
			.trim();
		if (fullNameSearch) {
			conditions.push(
				ilike(
					sql`concat_ws(' ', ${table.patientTable.firstName}, ${table.patientTable.middleName}, ${table.patientTable.lastName})`,
					`%${fullNameSearch}%`
				)
			);
		}

		// Father name (with title)
		if (params.fatherTitleId != null) {
			conditions.push(
				eq(table.patientTable.fatherTitleId, params.fatherTitleId)
			);
		}
		if (fatherNameTrim) {
			conditions.push(
				ilike(
					table.patientTable.fatherName,
					`%${fatherNameTrim}%`
				)
			);
		}

		// Primary phone (with country code)
		if (phonePrimaryTrim) {
			conditions.push(
				ilike(
					table.patientTable.phonePrimary,
					`%${phonePrimaryTrim}%`
				)
			);
		}

		// Identity (type + number)
		if (params.identityTypeId != null) {
			conditions.push(
				eq(
					table.patientTable.identityTypeId,
					params.identityTypeId
				)
			);
		}
		if (identityNoTrim) {
			conditions.push(
				ilike(
					table.patientTable.identityNo,
					`%${identityNoTrim}%`
				)
			);
		}

		// If no criteria at all, nothing to search
		if (conditions.length <= 1) {
			// only status != DELETED (and maybe excludePatientId) present
			return [];
		}

		return ensureDb().query.patientTable.findMany({
			where: and(...conditions),
			with: {
				user: true,
				title: true,
				fatherTitle: true,
				religion: true,
				maritalStatus: true,
				gender: true,
				identityType: true,
				bloodType: true,
				city: true,
				state: true,
				country: true,
				status: true,
				attachments: true,
				insurances: { with: { insurance: true } },
				allergies: true,
			},
		});
	}
);

// get one
export const getPatientById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<PatientSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientTable)
			.where(eq(table.patientTable.id, id));
		return row ?? null;
	}
);

// get one with relations
export const getPatientByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: string }) => {
		return ensureDb().query.patientTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				user: true,
				title: true,
				religion: true,
				maritalStatus: true,
				gender: true,
				identityType: true,
				bloodType: true,
				city: true,
				state: true,
				country: true,
				status: true,
				attachments: true,
				insurances: { with: { insurance: true } },
				allergies: true,
			},
		});
	}
);

// create
export const createPatient = command(
	'unchecked' as const,
	async (payload: PatientSchemaInsert): Promise<PatientSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatient().refresh();
		return row;
	}
);

// update
export const updatePatient = command(
	'unchecked' as const,
	async (payload: { id: string } & PatientSchemaUpdate): Promise<PatientSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.patientTable)
			.set(rest as PatientSchemaUpdate)
			.where(eq(table.patientTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatient().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePatient = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb()
			.update(table.patientTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.patientTable.id, id));
		getPatient().refresh();
	}
);

// delete complete (hard)
export const deletePatientComplete = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb().delete(table.patientTable).where(eq(table.patientTable.id, id));
		getPatient().refresh();
	}
);

// Generate random password (mirrors staff.remote)
function generateRandomPassword(length: number = 16): string {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return password;
}

// Create patient with Better Auth user (email/password)
export const createPatientWithUser = command(
	'unchecked' as const,
	async (payload: {
		// User fields
		email: string;
		name: string;
		// Patient fields (only include fields that exist in patientTable)
		code?: string;
		titleId?: number;
		firstName?: string;
		middleName?: string;
		lastName?: string;
		phonePrimary?: string;
		phoneSecondary?: string;
		phonePrimaryCountryId?: number;
		phoneSecondaryCountryId?: number;
		identityNo?: string;
		dateOfBirth?: string;
		guardianName?: string;
		guardianPhone?: string;
		guardianPhoneCountryId?: number;
		photoPath?: string;
		address?: string;
		remark?: string;
		maritalStatusId?: number;
		genderId?: number;
		identityTypeId?: number;
		bloodTypeId?: number;
		cityId?: number;
		stateId?: number;
		countryId?: number;
		postalCodeId?: number;
		nationalityId?: number;
		religionId?: number;
		isActive?: boolean;
		nameMasking?: boolean;
	}): Promise<{ patient: PatientSchema; userId: string; generatedPassword: string }> => {
		const passwordHashUtil = new PasswordHashUtil();

		// Ensure email is unique
		const existingUser = await ensureDb()
			.select()
			.from(userTable)
			.where(eq(userTable.email, payload.email))
			.limit(1);
		if (existingUser.length > 0) {
			throw error(400, 'Patient with this email already exists');
		}

		// Generate random password for Better Auth user
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
				emailVerified: false,
			})
			.returning();

		if (!user) throw error(400, 'Failed to create patient user.');

		// Create Better Auth account (email/password)
		await ensureDb().insert(accountTable).values({
			id: uuidv7(),
			userId: user.id,
			accountId: payload.email,
			providerId: 'credential',
			password: hashedPassword,
		});

		// Prepare patient payload (only fields that exist in patientTable)
		const patientPayload: PatientSchemaInsert = {
			userId: user.id,
			code: payload.code,
			titleId: payload.titleId ? Number(payload.titleId) : undefined,
			firstName: payload.firstName,
			middleName: payload.middleName,
			lastName: payload.lastName,
			phonePrimary: payload.phonePrimary,
			phoneSecondary: payload.phoneSecondary,
			phonePrimaryCountryId: payload.phonePrimaryCountryId ? Number(payload.phonePrimaryCountryId) : undefined,
			phoneSecondaryCountryId: payload.phoneSecondaryCountryId ? Number(payload.phoneSecondaryCountryId) : undefined,
			identityNo: payload.identityNo,
			dateOfBirth: payload.dateOfBirth
				? new Date(payload.dateOfBirth).toISOString().split('T')[0]
				: undefined,
			guardianName: payload.guardianName,
			guardianPhone: payload.guardianPhone,
			guardianPhoneCountryId: payload.guardianPhoneCountryId
				? Number(payload.guardianPhoneCountryId)
				: undefined,
			photoPath: payload.photoPath,
			address: payload.address,
			remark: payload.remark,
			maritalStatusId: payload.maritalStatusId
				? Number(payload.maritalStatusId)
				: undefined,
			genderId: payload.genderId ? Number(payload.genderId) : undefined,
			identityTypeId: payload.identityTypeId
				? Number(payload.identityTypeId)
				: undefined,
			bloodTypeId: payload.bloodTypeId ? Number(payload.bloodTypeId) : undefined,
			cityId: payload.cityId ? Number(payload.cityId) : undefined,
			stateId: payload.stateId ? Number(payload.stateId) : undefined,
			countryId: payload.countryId ? Number(payload.countryId) : undefined,
			postalCodeId: payload.postalCodeId ? Number(payload.postalCodeId) : undefined,
			nationalityId: payload.nationalityId ? Number(payload.nationalityId) : undefined,
			religionId: payload.religionId ? Number(payload.religionId) : undefined,
			statusId: payload.isActive === false ? StatusEnum.INACTIVE : StatusEnum.ACTIVE,
			nameMasking: payload.nameMasking === true ? YesNoEnum.YES : YesNoEnum.NO,
		};

		const [patient] = await ensureDb()
			.insert(table.patientTable)
			.values(patientPayload)
			.returning();

		if (!patient) throw error(400, 'Failed to create patient.');

		getPatient().refresh();

		return { patient, userId: user.id, generatedPassword };
	}
);

