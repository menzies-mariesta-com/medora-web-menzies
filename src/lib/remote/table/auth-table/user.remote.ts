import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
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
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ilike } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { RoleEnum } from '$lib/model/enum/db-link';

// get all
export const getUser = query(async (): Promise<UserSchema[]> => {
	const data = await ensureDb()
		.select()
		.from(table.userTable);
	return data;
});

// get count
export const getUserCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.userTable);
	return row?.count ?? 0;
});

// get paginated
export const getUserPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<UserSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.userTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.userTable)
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
);

// get one
export const getUserById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<UserSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.userTable)
			.where(eq(table.userTable.id, id));
		return row ?? null;
	}
);

// get all with linked staff profile (1:1 via staff.userId)
export const getUserWithStaff = query(async () => {
	return ensureDb().query.userTable.findMany({
		with: {
			staff: true
		}
	});
});

// get one with linked staff profile
export const getUserByIdWithStaff = query(
	'unchecked' as const,
	async ({ id }: { id: string }) => {
		return ensureDb().query.userTable.findFirst({
			where: (user, { eq }) => eq(user.id, id),
			with: {
				staff: true
			}
		});
	}
);

// get users by role (e.g. OWNER for system admin management)
export const getUsersByRole = query(
	'unchecked' as const,
	async ({ roleId }: { roleId: number }): Promise<UserSchema[]> => {
		return ensureDb()
			.select()
			.from(table.userTable)
			.where(eq(table.userTable.roleId, roleId));
	}
);

export const getUsersByRolePaginated = query(
	'unchecked' as const,
	async (
		params: PaginationParams & {
			roleId: number;
			name?: string | null;
			email?: string | null;
		}
	): Promise<PaginatedResult<UserSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
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

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.userTable)
				.where(whereExpr)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.userTable)
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
);

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

// create owner (user with role OWNER + credential account); no password — send reset email after. SYSTEM_ADMIN only.
export const createOwner = command(
	'unchecked' as const,
	async (payload: {
		name: string;
		email: string;
	}): Promise<UserSchema> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN)
			throw error(403, 'Only system admin can create owners');
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
		const hashedPassword =
			await passwordHashUtil.hash(generatedPassword);
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
		getUser().refresh();
		return user;
	}
);

// update (e.g. name, image, email, etc.)
export const updateUser = command(
	'unchecked' as const,
	async (
		payload: { id: string } & UserSchemaUpdate
	): Promise<UserSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.userTable)
			.set(rest as UserSchemaUpdate)
			.where(eq(table.userTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getUser().refresh();
		return row;
	}
);

// delete user completely (cascades to sessions/accounts via FK). SYSTEM_ADMIN only.
export const deleteUser = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN)
			throw error(403, 'Only system admin can delete users');
		await ensureDb()
			.delete(table.userTable)
			.where(eq(table.userTable.id, id));
		getUser().refresh();
	}
);
