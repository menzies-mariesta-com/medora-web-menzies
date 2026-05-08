import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { StatusEnum } from '$lib/model/enum/db-link';

export type SelfAccountSettings = {
	email: string | null;
	staffId: string;
	firstName: string | null;
	middleName: string | null;
	lastName: string | null;
	phonePrimary: string | null;
	address: string | null;
	dateOfBirth: string | null;
	genderId: number | null;
	photoUrl: string | null;
	licenseNo: string | null;
	licenseExpiryDate: string | null;
	signatureImageUrl: string | null;
	signatureText: string | null;
};

async function ensureStaffInHospital(staffId: string, hospitalId: string) {
	const [row] = await ensureDb()
		.select({ id: table.staffHospitalTable.id })
		.from(table.staffHospitalTable)
		.where(
			and(
				eq(table.staffHospitalTable.staffId, staffId),
				eq(table.staffHospitalTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!row) throw error(403, 'Staff is not assigned to this hospital');
}

export async function getSelfAccountSettings(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<SelfAccountSettings> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	if (!staffId) throw error(400, 'No staff profile linked to this account');
	await ensureStaffInHospital(staffId, input.hospitalId);

	const [staff] = await ensureDb()
		.select({
			id: table.staffTable.id,
			firstName: table.staffTable.firstName,
			middleName: table.staffTable.middleName,
			lastName: table.staffTable.lastName,
			phonePrimary: table.staffTable.phonePrimary,
			address: table.staffTable.address,
			dateOfBirth: table.staffTable.dateOfBirth,
			genderId: table.staffTable.genderId,
			photoUrl: table.staffTable.photoUrl,
			staffDetailId: table.staffTable.staffDetailId,
			statusId: table.staffTable.statusId
		})
		.from(table.staffTable)
		.where(eq(table.staffTable.id, staffId))
		.limit(1);

	if (!staff || staff.statusId === StatusEnum.DELETED) {
		throw error(404, 'Staff not found');
	}

	const staffDetail =
		staff.staffDetailId == null
			? null
			: (
					await ensureDb()
						.select({
							licenseNo: table.staffDetailTable.licenseNo,
							licenseExpiryDate: table.staffDetailTable.licenseExpiryDate,
							signatureImageUrl:
								table.staffDetailTable.signatureImageUrl,
							signatureText: table.staffDetailTable.signatureText
						})
						.from(table.staffDetailTable)
						.where(eq(table.staffDetailTable.id, staff.staffDetailId))
						.limit(1)
				)[0] ?? null;

	return {
		email: event.locals.user?.email ?? null,
		staffId: staff.id,
		firstName: staff.firstName,
		middleName: staff.middleName,
		lastName: staff.lastName,
		phonePrimary: staff.phonePrimary,
		address: staff.address,
		dateOfBirth: staff.dateOfBirth,
		genderId: staff.genderId,
		photoUrl: staff.photoUrl,
		licenseNo: staffDetail?.licenseNo ?? null,
		licenseExpiryDate: staffDetail?.licenseExpiryDate ?? null,
		signatureImageUrl: staffDetail?.signatureImageUrl ?? null,
		signatureText: staffDetail?.signatureText ?? null
	};
}

export type UpdateSelfAccountSettingsInput = {
	hospitalId: string;
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
	phonePrimary?: string | null;
	address?: string | null;
	dateOfBirth?: string | null;
	genderId?: number | null;
	photoUrl?: string | null;
	licenseNo?: string | null;
	licenseExpiryDate?: string | null;
	signatureImageUrl?: string | null;
	signatureText?: string | null;
};

function normalizeString(v: unknown): string | null | undefined {
	if (v === undefined) return undefined;
	if (v === null) return null;
	if (typeof v !== 'string') return undefined;
	const t = v.trim();
	return t ? t : null;
}

function normalizeDateOnly(v: unknown): string | null | undefined {
	const s = normalizeString(v);
	if (s === undefined) return undefined;
	if (s === null) return null;
	// Accept YYYY-MM-DD only
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw error(400, 'Invalid date');
	return s;
}

export async function updateSelfAccountSettings(
	event: RequestEvent,
	input: UpdateSelfAccountSettingsInput
): Promise<{ ok: true }> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	if (!staffId) throw error(400, 'No staff profile linked to this account');
	await ensureStaffInHospital(staffId, input.hospitalId);

	const setObj: Partial<typeof table.staffTable.$inferInsert> = {};

	const firstName = normalizeString(input.firstName);
	if (firstName !== undefined) setObj.firstName = firstName;
	const middleName = normalizeString(input.middleName);
	if (middleName !== undefined) setObj.middleName = middleName;
	const lastName = normalizeString(input.lastName);
	if (lastName !== undefined) setObj.lastName = lastName;
	const phonePrimary = normalizeString(input.phonePrimary);
	if (phonePrimary !== undefined) setObj.phonePrimary = phonePrimary;
	const address = normalizeString(input.address);
	if (address !== undefined) setObj.address = address;

	const dateOfBirth = normalizeDateOnly(input.dateOfBirth);
	if (dateOfBirth !== undefined) setObj.dateOfBirth = dateOfBirth;

	if (input.genderId !== undefined) {
		if (input.genderId === null) setObj.genderId = null;
		else if (
			typeof input.genderId === 'number' &&
			Number.isInteger(input.genderId) &&
			input.genderId > 0
		) {
			setObj.genderId = input.genderId;
		} else {
			throw error(400, 'Invalid genderId');
		}
	}

	if (input.photoUrl !== undefined) {
		const p = normalizeString(input.photoUrl);
		// if photoUrl provided as '' treat as null
		setObj.photoUrl = p ?? null;
	}

	const detailSetObj: Partial<typeof table.staffDetailTable.$inferInsert> =
		{};

	if (input.licenseNo !== undefined) {
		detailSetObj.licenseNo = normalizeString(input.licenseNo) ?? null;
	}
	if (input.licenseExpiryDate !== undefined) {
		detailSetObj.licenseExpiryDate =
			normalizeDateOnly(input.licenseExpiryDate) ?? null;
	}
	if (input.signatureImageUrl !== undefined) {
		detailSetObj.signatureImageUrl =
			normalizeString(input.signatureImageUrl) ?? null;
	}
	if (input.signatureText !== undefined) {
		detailSetObj.signatureText =
			normalizeString(input.signatureText) ?? null;
	}

	if (
		Object.keys(setObj).length === 0 &&
		Object.keys(detailSetObj).length === 0
	) {
		return { ok: true };
	}

	const db = ensureDb();

	const [staff] = await db
		.select({
			staffDetailId: table.staffTable.staffDetailId,
			statusId: table.staffTable.statusId
		})
		.from(table.staffTable)
		.where(eq(table.staffTable.id, staffId))
		.limit(1);

	if (!staff || staff.statusId === StatusEnum.DELETED) {
		throw error(404, 'Staff not found');
	}

	let staffDetailId = staff.staffDetailId;
	if (staffDetailId == null && Object.keys(detailSetObj).length) {
		const [created] = await db
			.insert(table.staffDetailTable)
			.values({
				...detailSetObj,
				createdBy: event.locals.user?.id ?? null,
				updatedBy: event.locals.user?.id ?? null
			})
			.returning({ id: table.staffDetailTable.id });

		if (!created?.id) throw error(500, 'Failed to create staff detail');
		staffDetailId = created.id;
		await db
			.update(table.staffTable)
			.set({
				staffDetailId,
				updatedBy: event.locals.user?.id ?? null
			})
			.where(eq(table.staffTable.id, staffId));
	}

	if (Object.keys(setObj).length) {
		await db
		.update(table.staffTable)
		.set({
			...setObj,
			updatedBy: event.locals.user?.id ?? null
		})
		.where(eq(table.staffTable.id, staffId));
	}

	if (staffDetailId != null && Object.keys(detailSetObj).length) {
		await db
			.update(table.staffDetailTable)
			.set({
				...detailSetObj,
				updatedBy: event.locals.user?.id ?? null
			})
			.where(eq(table.staffDetailTable.id, staffDetailId));
	}

	return { ok: true };
}

