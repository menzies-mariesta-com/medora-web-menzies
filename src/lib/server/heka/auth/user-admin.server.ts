import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	accountTable,
	userTable
} from '$lib/server/db/table/auth-table/auth-table';
import type {
	UserSchema,
	UserSchemaUpdate
} from '$lib/server/db/table/auth-table/auth-table-schema-type';
import { RoleEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { and, count, eq, ilike } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

function generateRandomPassword(length = 16): string {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return password;
}

export async function createOwner(
	event: RequestEvent,
	payload: { name: string; email: string }
): Promise<UserSchema> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw error(403, 'Only system admin can create owners');
	}
	const passwordHashUtil = new PasswordHashUtil();
	const existing = await ensureDb()
		.select()
		.from(userTable)
		.where(eq(userTable.email, payload.email))
		.limit(1);
	if (existing.length > 0) {
		throw error(400, 'A user with this email already exists.');
	}
	const generatedPassword = generateRandomPassword(16);
	const hashedPassword = await passwordHashUtil.hash(generatedPassword);
	const userId = uuidv7();
	const [user] = await ensureDb()
		.insert(userTable)
		.values({
			id: userId,
			name: payload.name.trim(),
			email: payload.email.trim(),
			emailVerified: false,
			roleId: RoleEnum.OWNER
		})
		.returning();
	if (!user) throw error(400, 'Failed to create owner.');
	await ensureDb().insert(accountTable).values({
		id: uuidv7(),
		userId: user.id,
		accountId: payload.email.trim(),
		providerId: 'credential',
		password: hashedPassword
	});
	return user;
}

export async function updateUser(
	event: RequestEvent,
	payload: { id: string } & UserSchemaUpdate
): Promise<UserSchema> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	const isSelf = event.locals.user.id === payload.id;
	if (
		!isSelf &&
		event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN
	) {
		throw error(403, 'Forbidden');
	}
	const { id, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.userTable)
		.set(rest as UserSchemaUpdate)
		.where(eq(table.userTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function getUsersByRolePaginated(
	event: RequestEvent,
	params: PaginationParams & {
		roleId: number;
		name?: string | null;
		email?: string | null;
		statusId?: number | null;
	}
): Promise<PaginatedResult<UserSchema>> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw error(403, 'Forbidden');
	}
	const { page, pageSize, limit, offset } = normalizePagination(params);
	let whereExpr = eq(table.userTable.roleId, params.roleId);
	const nameTerm = params.name?.trim();
	if (nameTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.userTable.name, `%${nameTerm}%`)
		) as typeof whereExpr;
	}
	const emailTerm = params.email?.trim();
	if (emailTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.userTable.email, `%${emailTerm}%`)
		) as typeof whereExpr;
	}
	const needsRoleStatus = typeof params.statusId === 'number';

	const [data, countRows] = await Promise.all([
		needsRoleStatus
			? ensureDb()
					.select({ user: table.userTable })
					.from(table.userTable)
					.innerJoin(
						table.roleTable,
						eq(table.userTable.roleId, table.roleTable.id)
					)
					.where(
						and(whereExpr, eq(table.roleTable.statusId, params.statusId!))
					)
					.limit(limit)
					.offset(offset)
					.then((rows) => rows.map((r) => r.user))
			: ensureDb()
					.select()
					.from(table.userTable)
					.where(whereExpr)
					.limit(limit)
					.offset(offset),
		needsRoleStatus
			? ensureDb()
					.select({ count: count() })
					.from(table.userTable)
					.innerJoin(
						table.roleTable,
						eq(table.userTable.roleId, table.roleTable.id)
					)
					.where(
						and(whereExpr, eq(table.roleTable.statusId, params.statusId!))
					)
			: ensureDb()
					.select({ count: count() })
					.from(table.userTable)
					.where(whereExpr)
	]);
	const total = countRows[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function listUsersByRole(
	event: RequestEvent,
	roleId: number
): Promise<UserSchema[]> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw error(403, 'Forbidden');
	}
	return ensureDb()
		.select()
		.from(table.userTable)
		.where(eq(table.userTable.roleId, roleId));
}

export async function deleteUserById(
	event: RequestEvent,
	id: string
): Promise<void> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw error(403, 'Only system admin can delete users');
	}
	await ensureDb()
		.delete(table.userTable)
		.where(eq(table.userTable.id, id));
}
