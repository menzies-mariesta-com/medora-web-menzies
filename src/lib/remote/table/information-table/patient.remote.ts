import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientSchema,
	PatientSchemaInsert,
	PatientSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { uuidv7 } from 'uuidv7';
import { userTable, accountTable } from '$lib/server/db/table/auth-table/auth-table';

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

// get paginated
export const getPatientPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<PatientSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.patientTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.patientTable),
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
		guardian_name?: string;
		guardian_phone?: string;
		photo_path?: string;
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
		religion?: string;
		isActive?: boolean;
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
			guardian_name: payload.guardian_name,
			guardian_phone: payload.guardian_phone,
			photo_path: payload.photo_path,
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
			religion: payload.religion?.trim() || undefined,
			statusId: payload.isActive === false ? StatusEnum.INACTIVE : StatusEnum.ACTIVE,
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

