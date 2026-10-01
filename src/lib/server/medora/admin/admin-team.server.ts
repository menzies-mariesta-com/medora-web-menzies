import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ilike } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	accountTable,
	userTable
} from '$lib/server/db/table/auth-table/auth-table';
import { AdminPageKeyEnum, RoleEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import type {
	AdminTeamInvitePayload,
	AdminTeamMember,
	AdminTeamUpdatePayload
} from '$lib/model/type/medora/admin-team.type';
import { PasswordHashUtil } from '$lib/util/password-hash.util.svelte';
import { uuidv7 } from 'uuidv7';
import {
	loadAdminPagePermissions,
	normalizePermissionRows,
	replaceAdminPagePermissions,
	requireAdminPagePermission
} from './admin-permission.server';

function generateRandomPassword(length = 16): string {
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

function toIso(value: string | Date | null | undefined): string {
	if (!value) return new Date().toISOString();
	if (value instanceof Date) return value.toISOString();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

async function assertCanManageTeam(event: RequestEvent): Promise<void> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	if (event.locals.userRoleId !== RoleEnum.SYSTEM_ADMIN) {
		throw error(403, 'Only system admin can manage the admin team');
	}
}

async function assertCanViewTeam(event: RequestEvent): Promise<void> {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.TEAM,
		'view'
	);
}

async function toTeamMember(
	user: typeof userTable.$inferSelect
): Promise<AdminTeamMember> {
	const permissions = await loadAdminPagePermissions(user.id);
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		emailVerified: user.emailVerified,
		createdAt: toIso(user.createdAt),
		updatedAt: toIso(user.updatedAt),
		permissions
	};
}

export async function listAdminTeamPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		name?: string | null;
		email?: string | null;
	}
): Promise<PaginatedResult<AdminTeamMember>> {
	await assertCanViewTeam(event);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const filters = [eq(userTable.roleId, RoleEnum.ADMIN_TEAM)];
	const nameTerm = params.name?.trim();
	if (nameTerm) {
		filters.push(ilike(userTable.name, `%${nameTerm}%`));
	}
	const emailTerm = params.email?.trim();
	if (emailTerm) {
		filters.push(ilike(userTable.email, `%${emailTerm}%`));
	}
	const whereExpr = and(...filters);

	const db = ensureDb();
	const [rows, countRows] = await Promise.all([
		db
			.select()
			.from(userTable)
			.where(whereExpr)
			.limit(limit)
			.offset(offset),
		db.select({ count: count() }).from(userTable).where(whereExpr)
	]);

	const data = await Promise.all(rows.map((u) => toTeamMember(u)));
	const total = Number(countRows[0]?.count ?? 0);
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getAdminTeamMember(
	event: RequestEvent,
	userId: string
): Promise<AdminTeamMember> {
	await assertCanViewTeam(event);
	if (!userId) throw error(400, 'userId is required');
	const [user] = await ensureDb()
		.select()
		.from(userTable)
		.where(
			and(
				eq(userTable.id, userId),
				eq(userTable.roleId, RoleEnum.ADMIN_TEAM)
			)
		)
		.limit(1);
	if (!user) throw error(404, 'Admin team member not found');
	return toTeamMember(user);
}

export async function inviteAdminTeamMember(
	event: RequestEvent,
	payload: AdminTeamInvitePayload
): Promise<AdminTeamMember> {
	await assertCanManageTeam(event);

	const name = payload.name?.trim() ?? '';
	const email = payload.email?.trim().toLowerCase() ?? '';
	if (!name) throw error(400, 'Name is required');
	if (!email) throw error(400, 'Email is required');

	const permissions = normalizePermissionRows(payload.permissions);
	if (!permissions.some((p) => p.canView)) {
		throw error(400, 'Grant at least one page view permission');
	}

	const existing = await ensureDb()
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.email, email))
		.limit(1);
	if (existing.length > 0) {
		throw error(400, 'A user with this email already exists.');
	}

	const passwordHashUtil = new PasswordHashUtil();
	const hashedPassword = await passwordHashUtil.hash(
		generateRandomPassword(16)
	);
	const userId = uuidv7();

	const [user] = await ensureDb()
		.insert(userTable)
		.values({
			id: userId,
			name,
			email,
			emailVerified: false,
			roleId: RoleEnum.ADMIN_TEAM
		})
		.returning();
	if (!user) throw error(400, 'Failed to create admin team member.');

	await ensureDb().insert(accountTable).values({
		id: uuidv7(),
		userId: user.id,
		accountId: email,
		providerId: 'credential',
		password: hashedPassword
	});

	await replaceAdminPagePermissions(user.id, permissions);
	return toTeamMember(user);
}

export async function updateAdminTeamMember(
	event: RequestEvent,
	userId: string,
	payload: AdminTeamUpdatePayload
): Promise<AdminTeamMember> {
	await assertCanManageTeam(event);
	if (!userId) throw error(400, 'userId is required');

	const [user] = await ensureDb()
		.select()
		.from(userTable)
		.where(
			and(
				eq(userTable.id, userId),
				eq(userTable.roleId, RoleEnum.ADMIN_TEAM)
			)
		)
		.limit(1);
	if (!user) throw error(404, 'Admin team member not found');

	const permissions = normalizePermissionRows(payload.permissions);
	if (!permissions.some((p) => p.canView)) {
		throw error(400, 'Grant at least one page view permission');
	}

	const name = payload.name?.trim();
	if (name && name !== user.name) {
		await ensureDb()
			.update(userTable)
			.set({ name })
			.where(eq(userTable.id, userId));
	}

	await replaceAdminPagePermissions(userId, permissions);

	const [updated] = await ensureDb()
		.select()
		.from(userTable)
		.where(eq(userTable.id, userId))
		.limit(1);
	if (!updated) throw error(404, 'Admin team member not found');
	return toTeamMember(updated);
}

export async function revokeAdminTeamMember(
	event: RequestEvent,
	userId: string
): Promise<void> {
	await assertCanManageTeam(event);
	if (!userId) throw error(400, 'userId is required');

	const [user] = await ensureDb()
		.select({ id: userTable.id })
		.from(userTable)
		.where(
			and(
				eq(userTable.id, userId),
				eq(userTable.roleId, RoleEnum.ADMIN_TEAM)
			)
		)
		.limit(1);
	if (!user) throw error(404, 'Admin team member not found');

	await ensureDb()
		.delete(table.userTable)
		.where(eq(table.userTable.id, userId));
}
