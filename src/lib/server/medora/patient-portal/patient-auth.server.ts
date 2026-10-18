import { error } from '@sveltejs/kit';
import { and, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	accountTable,
	sessionTable,
	userTable
} from '$lib/server/db/table/auth-table/auth-table';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { PasswordHashUtil } from '$lib/server/auth/password-hash.server';
import { uuidV7 } from '$lib/util/id.util';

const passwordHashUtil = new PasswordHashUtil();
const SESSION_SECONDS = 60 * 60 * 2;

function normalizePhone(value: string): string {
	return value.replace(/\D/g, '');
}

export function normalizePatientLoginIdentifier(raw: string): string {
	return raw.trim();
}

export async function resolvePatientUserByIdentifier(identifier: string) {
	const id = normalizePatientLoginIdentifier(identifier);
	if (!id) return null;

	const phoneDigits = normalizePhone(id);
	const conditions = [
		eq(userTable.roleId, RoleEnum.PATIENT),
		ne(table.patientTable.statusId, StatusEnum.DELETED),
		or(
			ilike(table.patientTable.code, id),
			ilike(userTable.email, id.toLowerCase()),
			phoneDigits.length >= 6
				? sql`regexp_replace(coalesce(${table.patientTable.phonePrimary}, ''), '\\D', '', 'g') = ${phoneDigits}`
				: sql`false`
		)
	];

	const rows = await ensureDb()
		.select({
			userId: userTable.id,
			email: userTable.email,
			mustChangePassword: userTable.mustChangePassword,
			patientId: table.patientTable.id,
			hospitalId: table.patientTable.hospitalId,
			patientCode: table.patientTable.code
		})
		.from(table.patientTable)
		.innerJoin(userTable, eq(table.patientTable.userId, userTable.id))
		.where(and(...conditions))
		.limit(5);

	if (rows.length === 0) return null;
	if (rows.length > 1) {
		throw error(
			409,
			'Multiple patients match this login. Use your patient code or contact the hospital.'
		);
	}
	return rows[0]!;
}

export async function verifyPatientCredentialPassword(
	userId: string,
	password: string
): Promise<boolean> {
	const [account] = await ensureDb()
		.select({ password: accountTable.password })
		.from(accountTable)
		.where(
			and(
				eq(accountTable.userId, userId),
				eq(accountTable.providerId, 'credential')
			)
		)
		.limit(1);
	if (!account?.password) return false;
	return passwordHashUtil.verify({
		password,
		hash: account.password
	});
}

export async function createPatientPortalSession(userId: string): Promise<string> {
	const token = uuidV7().replace(/-/g, '') + uuidV7().replace(/-/g, '');
	const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
	await ensureDb().insert(sessionTable).values({
		id: uuidV7(),
		userId,
		token,
		expiresAt
	});
	return token;
}

export async function patientPortalSignIn(input: {
	identifier: string;
	password: string;
}) {
	const resolved = await resolvePatientUserByIdentifier(input.identifier);
	if (!resolved) {
		throw error(401, 'Invalid patient ID or password');
	}
	const ok = await verifyPatientCredentialPassword(
		resolved.userId,
		input.password
	);
	if (!ok) {
		throw error(401, 'Invalid patient ID or password');
	}
	const token = await createPatientPortalSession(resolved.userId);
	return {
		token,
		mustChangePassword: Boolean(resolved.mustChangePassword),
		userId: resolved.userId,
		patientId: resolved.patientId,
		hospitalId: resolved.hospitalId,
		patientCode: resolved.patientCode
	};
}

export async function changePatientPortalPassword(input: {
	userId: string;
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}) {
	if (input.newPassword !== input.confirmPassword) {
		throw error(400, 'New password and confirmation do not match');
	}
	if (input.newPassword.length < 8) {
		throw error(400, 'New password must be at least 8 characters');
	}
	const ok = await verifyPatientCredentialPassword(
		input.userId,
		input.currentPassword
	);
	if (!ok) {
		throw error(401, 'Current password is incorrect');
	}
	const hashed = await passwordHashUtil.hash(input.newPassword);
	await ensureDb()
		.update(accountTable)
		.set({ password: hashed, updatedAt: new Date().toISOString() })
		.where(
			and(
				eq(accountTable.userId, input.userId),
				eq(accountTable.providerId, 'credential')
			)
		);
	await ensureDb()
		.update(userTable)
		.set({
			mustChangePassword: false,
			updatedAt: new Date().toISOString()
		})
		.where(eq(userTable.id, input.userId));
}
