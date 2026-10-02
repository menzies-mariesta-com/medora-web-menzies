import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientSchema,
	PatientSchemaInsert,
	PatientSchemaUpdate
} from '$lib/server/db/schema-type';
import {
	userTable,
	accountTable
} from '$lib/server/db/table/auth-table/auth-table';
import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { and, eq, ilike, ne, or, sql, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

const NO_EMAIL_SUFFIX = '@no-email.medora';

/** Auth emails are globally unique; remapped so the same contact email can exist per hospital. */
function hospitalScopedAuthEmail(
	email: string,
	hospitalId: string
): string {
	const at = email.lastIndexOf('@');
	if (at <= 0) return `${uuidv7()}${NO_EMAIL_SUFFIX}`;
	const local = email.slice(0, at);
	const domain = email.slice(at + 1);
	const tag = hospitalId.replace(/-/g, '').slice(0, 8);
	return `${local}+h${tag}@${domain}`;
}

/** Registration view/edit: include the same relation edges as duplicate-check where the form uses FKs + lookups (avoids “empty” nested data vs duplicate flow). */
const patientFormWith = {
	user: true,
	title: true,
	hospital: true,
	religion: true,
	maritalStatus: true,
	gender: true,
	identityType: true,
	bloodType: true,
	city: true,
	state: true,
	country: true,
	postalCode: true,
	nationality: true,
	status: true,
	attachments: true,
	insurances: { with: { insurance: true } },
	allergies: true,
	fatherTitle: true,
	guardianTitle: true,
	guardianPhoneCountry: true,
	phonePrimaryCountry: true,
	phoneSecondaryCountry: true,
	createdByUser: true,
	updatedByUser: true
} as const;

const patientDuplicateWith = {
	user: true,
	title: true,
	hospital: true,
	religion: true,
	maritalStatus: true,
	gender: true,
	identityType: true,
	bloodType: true,
	city: true,
	state: true,
	country: true,
	status: true,
	phonePrimaryCountry: true,
	phoneSecondaryCountry: true,
	attachments: true,
	insurances: { with: { insurance: true } },
	allergies: true,
	fatherTitle: true,
	guardianTitle: true,
	guardianPhoneCountry: true,
	postalCode: true,
	nationality: true,
	visits: true,
	appointments: true,
	diagnoses: true,
	patientDocuments: true,
	createdByUser: true,
	updatedByUser: true
} as const;

export type PatientRegistrationFormRow = NonNullable<
	Awaited<ReturnType<typeof getPatientForRegistrationForm>>
>;

export async function getNextPatientCode(
	event: RequestEvent,
	hospitalId: string
): Promise<string> {
	await ensureCanAccessHospital(event, hospitalId);
	const db = ensureDb();
	const today = new Date();

	const [financialYear] = await db
		.select({
			id: table.financialYearTable.id,
			startDate: table.financialYearTable.startDate,
			endDate: table.financialYearTable.endDate
		})
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`
			)
		)
		.limit(1);

	if (!financialYear) {
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}

	return generatePrefix({
		hospitalId,
		branchId: null,
		financialYearId: financialYear.id,
		prefixKey: PREFIX_PURPOSE_STORAGE.PATIENT_CODE,
		context: {}
	});
}

export async function getPatientForRegistrationForm(
	event: RequestEvent,
	params: { hospitalId: string; id: string }
) {
	const { hospitalId, id } = params;
	await ensureCanAccessHospital(event, hospitalId);
	if (!id) throw error(400, 'Patient id is required');

	return ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.id, id),
			eq(table.patientTable.hospitalId, hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		with: patientFormWith
	});
}

export async function getDuplicatePatientsInHospital(
	event: RequestEvent,
	params: {
		hospitalId: string;
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
	}
) {
	const hospitalId = params.hospitalId?.trim() ?? '';
	if (!hospitalId) throw error(400, 'hospitalId is required');
	await ensureCanAccessHospital(event, hospitalId);

	/** Always scope duplicates to the hospital being registered into. */
	const hospitalScope: SQL[] = [
		eq(table.patientTable.hospitalId, hospitalId),
		ne(table.patientTable.statusId, StatusEnum.DELETED)
	];

	if (params.excludePatientId?.trim()) {
		hospitalScope.push(
			ne(table.patientTable.id, params.excludePatientId.trim())
		);
	}

	const firstNameTrim = params.firstName.trim();
	const middleNameTrim = (params.middleName ?? '').trim();
	const lastNameTrim = (params.lastName ?? '').trim();
	const fatherNameTrim = (params.fatherName ?? '').trim();
	const phonePrimaryTrim = (params.phonePrimary ?? '').trim();
	const identityNoTrim = (params.identityNo ?? '').trim();

	/** Additional match filters (AND). Only applied when provided. */
	const matchAll: SQL[] = [];

	const fullNameSearch = [firstNameTrim, middleNameTrim, lastNameTrim]
		.filter(Boolean)
		.join(' ')
		.trim();
	if (fullNameSearch) {
		matchAll.push(
			ilike(
				sql`concat_ws(' ', ${table.patientTable.firstName}, ${table.patientTable.middleName}, ${table.patientTable.lastName})`,
				`%${fullNameSearch}%`
			)
		);
	}

	if (params.fatherTitleId != null) {
		matchAll.push(
			eq(table.patientTable.fatherTitleId, params.fatherTitleId)
		);
	}
	if (fatherNameTrim) {
		matchAll.push(
			ilike(table.patientTable.fatherName, `%${fatherNameTrim}%`)
		);
	}

	if (phonePrimaryTrim) {
		matchAll.push(
			ilike(table.patientTable.phonePrimary, `%${phonePrimaryTrim}%`)
		);
	}

	if (params.identityTypeId != null) {
		matchAll.push(
			eq(table.patientTable.identityTypeId, params.identityTypeId)
		);
	}
	if (identityNoTrim) {
		matchAll.push(
			ilike(table.patientTable.identityNo, `%${identityNoTrim}%`)
		);
	}

	// titleId is accepted for API compatibility but not used as a match signal alone.
	void params.titleId;

	// Require at least one match field beyond hospital scope.
	if (matchAll.length === 0) {
		return [];
	}

	return ensureDb().query.patientTable.findMany({
		where: and(...hospitalScope, ...matchAll),
		with: patientDuplicateWith
	});
}

export async function updatePatientInHospital(
	event: RequestEvent,
	params: { hospitalId: string; id: string } & PatientSchemaUpdate
): Promise<PatientSchema> {
	const { hospitalId, id, ...rest } = params;
	await ensureCanAccessHospital(event, hospitalId);
	if (!id) throw error(400, 'Patient id is required');

	const existing = await ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.id, id),
			eq(table.patientTable.hospitalId, hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		columns: { id: true }
	});
	if (!existing) throw error(404, 'Patient not found');

	const [row] = await ensureDb()
		.update(table.patientTable)
		.set(rest as PatientSchemaUpdate)
		.where(
			and(
				eq(table.patientTable.id, id),
				eq(table.patientTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw error(400, 'Update failed');
	return row;
}

/**
 * Staff-side user update for a patient in a hospital.
 * Avoid calling `/api/medora/auth/user` from patient registration UI, since that endpoint blocks non-self updates.
 */
export async function updatePatientUserInHospital(
	event: RequestEvent,
	params: {
		hospitalId: string;
		patientId: string;
		userName?: string | null;
		userEmail?: string | null;
	}
) {
	const { hospitalId, patientId, userName, userEmail } = params;
	await ensureCanAccessHospital(event, hospitalId);
	if (!patientId) throw error(400, 'patientId is required');

	const patient = await ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.id, patientId),
			eq(table.patientTable.hospitalId, hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		columns: { id: true, userId: true }
	});
	if (!patient) throw error(404, 'Patient not found');
	if (!patient.userId) throw error(400, 'Patient user is missing');

	const updates: Record<string, unknown> = {};
	if (typeof userName === 'string') updates.name = userName;
	if (typeof userEmail === 'string') updates.email = userEmail;
	if (Object.keys(updates).length === 0) return { ok: true };

	await ensureDb()
		.update(userTable)
		.set(updates as any)
		.where(eq(userTable.id, patient.userId));

	// Keep credential accountId in sync when updating email.
	if (typeof userEmail === 'string' && userEmail.trim()) {
		await ensureDb()
			.update(accountTable)
			.set({ accountId: userEmail.trim() } as any)
			.where(eq(accountTable.userId, patient.userId));
	}

	return { ok: true };
}

function generateRandomPassword(length: number = 16): string {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += charset.charAt(
			Math.floor(Math.random() * charset.length)
		);
	}
	return password;
}

export async function createPatientWithUserInHospital(
	event: RequestEvent,
	payload: {
		email: string;
		name: string;
		hospitalId: string;
		branchId?: string;
		titleId?: number;
		firstName?: string;
		middleName?: string;
		lastName?: string;
		phonePrimary?: string;
		phoneSecondary?: string;
		phonePrimaryCountryId?: number;
		phoneSecondaryCountryId?: number;
		fatherTitleId?: number;
		fatherName?: string;
		guardianTitleId?: number;
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
	}
): Promise<{
	patient: PatientSchema;
	userId: string;
	generatedPassword: string;
	authEmail: string;
	emailRemapped: boolean;
}> {
	const passwordHashUtil = new PasswordHashUtil();

	if (!payload.hospitalId) {
		throw error(400, 'Hospital is required to create a patient.');
	}
	await ensureCanAccessHospital(event, payload.hospitalId);

	const hospitalId = payload.hospitalId;
	const requestedEmail = (payload.email ?? '').trim();
	const isPlaceholderEmail = requestedEmail.endsWith(NO_EMAIL_SUFFIX);
	const normalizedEmail = isPlaceholderEmail
		? requestedEmail
		: requestedEmail.toLowerCase();

	if (!normalizedEmail) {
		throw error(400, 'Email is required to create a patient user.');
	}

	let authEmail = normalizedEmail;
	let emailRemapped = false;

	if (!isPlaceholderEmail) {
		const remappedCandidate = hospitalScopedAuthEmail(
			normalizedEmail,
			hospitalId
		);
		const sameHospitalEmail = await ensureDb()
			.select({ id: table.patientTable.id })
			.from(table.patientTable)
			.innerJoin(
				userTable,
				eq(table.patientTable.userId, userTable.id)
			)
			.where(
				and(
					eq(table.patientTable.hospitalId, hospitalId),
					ne(table.patientTable.statusId, StatusEnum.DELETED),
					or(
						eq(userTable.email, normalizedEmail),
						eq(userTable.email, remappedCandidate)
					)
				)
			)
			.limit(1);
		if (sameHospitalEmail.length > 0) {
			throw error(400, 'Patient with this email already exists');
		}

		const existingUser = await ensureDb()
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.email, normalizedEmail))
			.limit(1);
		if (existingUser.length > 0) {
			const linkedPatient =
				await ensureDb().query.patientTable.findFirst({
					where: and(
						eq(table.patientTable.userId, existingUser[0].id),
						ne(table.patientTable.statusId, StatusEnum.DELETED)
					),
					columns: { id: true, hospitalId: true }
				});
			if (
				linkedPatient &&
				linkedPatient.hospitalId !== hospitalId
			) {
				// Auth emails are globally unique; remap so create is not blocked
				// by a patient registered at another hospital.
				const remappedTaken = await ensureDb()
					.select({ id: userTable.id })
					.from(userTable)
					.where(eq(userTable.email, remappedCandidate))
					.limit(1);
				authEmail =
					remappedTaken.length > 0
						? `${uuidv7()}${NO_EMAIL_SUFFIX}`
						: remappedCandidate;
				emailRemapped = true;
			} else {
				throw error(400, 'Email is already registered');
			}
		}
	} else {
		// Placeholder emails must still be unique on the user table.
		const existingPlaceholder = await ensureDb()
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.email, normalizedEmail))
			.limit(1);
		if (existingPlaceholder.length > 0) {
			authEmail = `${uuidv7()}${NO_EMAIL_SUFFIX}`;
			emailRemapped = true;
		}
	}

	const generatedPassword = generateRandomPassword(16);
	const hashedPassword =
		await passwordHashUtil.hash(generatedPassword);

	const userId = uuidv7();
	const [user] = await ensureDb()
		.insert(userTable)
		.values({
			id: userId,
			name: payload.name,
			email: authEmail,
			emailVerified: false
		})
		.returning();

	if (!user) throw error(400, 'Failed to create patient user.');

	await ensureDb().insert(accountTable).values({
		id: uuidv7(),
		userId: user.id,
		accountId: authEmail,
		providerId: 'credential',
		password: hashedPassword
	});

	const generatedCode = await getNextPatientCode(
		event,
		payload.hospitalId
	);

	const patientPayload: PatientSchemaInsert = {
		userId: user.id,
		hospitalId: payload.hospitalId,
		code: generatedCode,
		titleId: payload.titleId ? Number(payload.titleId) : undefined,
		firstName: payload.firstName,
		middleName: payload.middleName,
		lastName: payload.lastName,
		phonePrimary: payload.phonePrimary,
		phoneSecondary: payload.phoneSecondary,
		phonePrimaryCountryId: payload.phonePrimaryCountryId
			? Number(payload.phonePrimaryCountryId)
			: undefined,
		phoneSecondaryCountryId: payload.phoneSecondaryCountryId
			? Number(payload.phoneSecondaryCountryId)
			: undefined,
		fatherTitleId: payload.fatherTitleId
			? Number(payload.fatherTitleId)
			: undefined,
		fatherName: payload.fatherName,
		guardianTitleId: payload.guardianTitleId
			? Number(payload.guardianTitleId)
			: undefined,
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
		bloodTypeId: payload.bloodTypeId
			? Number(payload.bloodTypeId)
			: undefined,
		cityId: payload.cityId ? Number(payload.cityId) : undefined,
		stateId: payload.stateId ? Number(payload.stateId) : undefined,
		countryId: payload.countryId
			? Number(payload.countryId)
			: undefined,
		postalCodeId: payload.postalCodeId
			? Number(payload.postalCodeId)
			: undefined,
		nationalityId: payload.nationalityId
			? Number(payload.nationalityId)
			: undefined,
		religionId: payload.religionId
			? Number(payload.religionId)
			: undefined,
		statusId:
			payload.isActive === false
				? StatusEnum.INACTIVE
				: StatusEnum.ACTIVE,
		nameMasking:
			payload.nameMasking === true ? YesNoEnum.YES : YesNoEnum.NO
	};

	const [patient] = await ensureDb()
		.insert(table.patientTable)
		.values(patientPayload)
		.returning();

	if (!patient) throw error(400, 'Failed to create patient.');

	// Normalize placeholder no-email into a stable patientId-based "no-email" value.
	if (authEmail.endsWith(NO_EMAIL_SUFFIX)) {
		const stableNoEmail = `${patient.id}${NO_EMAIL_SUFFIX}`;
		await ensureDb()
			.update(userTable)
			.set({ email: stableNoEmail } as any)
			.where(eq(userTable.id, user.id));
		await ensureDb()
			.update(accountTable)
			.set({ accountId: stableNoEmail } as any)
			.where(eq(accountTable.userId, user.id));
		authEmail = stableNoEmail;
	}

	return {
		patient,
		userId: user.id,
		generatedPassword,
		authEmail,
		emailRemapped
	};
}
