import { env } from '$env/dynamic/private';
import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { RoleEnum } from '$lib/model/enum/db-link';
import {
	isSupportTicketStatus,
	SupportTicketStatusEnum
} from '$lib/model/enum/support-ticket-status.enum';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SupportTicketSchema } from '$lib/server/db/schema-type';
import { sendEmailServer } from '$lib/server/util/mailer.server';

export type SupportTicketSession = {
	authenticated: true;
	userId: string;
	userRoleId: number | null;
};

export type SupportTicketSessionResult =
	| SupportTicketSession
	| { authenticated: false; userId: null; userRoleId: null };

function requireUser(event: RequestEvent): {
	userId: string;
	userRoleId: number | null;
} {
	const user = event.locals.user;
	if (!user?.id) throw error(401, 'Unauthorized');
	return { userId: user.id, userRoleId: event.locals.userRoleId ?? null };
}

function isSystemAdmin(roleId: number | null): boolean {
	return roleId === RoleEnum.SYSTEM_ADMIN;
}

const activeTicketCondition = isNull(table.supportTicketTable.deletedAt);

export async function getSupportTicketSession(
	event: RequestEvent
): Promise<SupportTicketSessionResult> {
	const user = event.locals.user;
	if (!user?.id) {
		return { authenticated: false, userId: null, userRoleId: null };
	}
	return {
		authenticated: true,
		userId: user.id,
		userRoleId: event.locals.userRoleId ?? null
	};
}

export async function createSupportTicket(
	event: RequestEvent,
	payload: {
		subject: string;
		description: string;
		priority: number;
		hospitalId?: string | null;
		contextUrl?: string | null;
	}
): Promise<SupportTicketSchema> {
	const { userId } = requireUser(event);
	const subject = payload.subject?.trim() ?? '';
	const description = payload.description?.trim() ?? '';
	if (!subject) throw error(400, 'Subject is required');
	if (!description) throw error(400, 'Description is required');
	const priority = Number(payload.priority);
	if (!Number.isInteger(priority) || priority < 1 || priority > 4) {
		throw error(400, 'Priority must be between 1 and 4');
	}

	const [row] = await ensureDb()
		.insert(table.supportTicketTable)
		.values({
			subject,
			description,
			priority,
			status: SupportTicketStatusEnum.OPEN,
			requesterId: userId,
			hospitalId: payload.hospitalId?.trim() || null,
			contextUrl: payload.contextUrl?.trim() || null
		})
		.returning();
	if (!row) throw error(500, 'Failed to create ticket');

	const supportTo = env.SUPPORT_IT_EMAIL?.trim();
	if (supportTo) {
		const lines = [
			`New support ticket #${row.id}`,
			`Subject: ${row.subject}`,
			`Priority: ${row.priority}`,
			`Requester user id: ${row.requesterId}`,
			row.contextUrl ? `Context: ${row.contextUrl}` : null,
			'',
			row.description
		].filter(Boolean);
		void sendEmailServer({
			to: supportTo,
			subject: `[Heka Support] #${row.id} ${row.subject}`,
			message: lines.join('\n')
		});
	}

	return row;
}

type TicketListParams = PaginationParams & {
	status?: string;
};

export async function getMySupportTicketsPaginated(
	event: RequestEvent,
	params?: TicketListParams
): Promise<PaginatedResult<SupportTicketSchema>> {
	const { userId } = requireUser(event);
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const statusFilter =
		params?.status?.trim() && isSupportTicketStatus(params.status.trim())
			? params.status.trim()
			: null;

	const whereClause = and(
		activeTicketCondition,
		eq(table.supportTicketTable.requesterId, userId),
		statusFilter ? eq(table.supportTicketTable.status, statusFilter) : undefined
	);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.supportTicketTable)
			.where(whereClause)
			.orderBy(desc(table.supportTicketTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.supportTicketTable)
			.where(whereClause)
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

export async function getAllSupportTicketsPaginated(
	event: RequestEvent,
	params?: TicketListParams
): Promise<PaginatedResult<SupportTicketSchema>> {
	const { userRoleId } = requireUser(event);
	if (!isSystemAdmin(userRoleId)) {
		throw error(403, 'Only system administrators can view all tickets');
	}
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const statusFilter =
		params?.status?.trim() && isSupportTicketStatus(params.status.trim())
			? params.status.trim()
			: null;

	const whereClause = and(
		activeTicketCondition,
		statusFilter ? eq(table.supportTicketTable.status, statusFilter) : undefined
	);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.supportTicketTable)
			.where(whereClause)
			.orderBy(desc(table.supportTicketTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.supportTicketTable)
			.where(whereClause)
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

export async function getSupportTicketById(
	event: RequestEvent,
	{ id }: { id: number }
) {
	const { userId, userRoleId } = requireUser(event);
	const row = await ensureDb().query.supportTicketTable.findFirst({
		where: and(eq(table.supportTicketTable.id, id), activeTicketCondition),
		with: {
			requester: true,
			hospital: true,
			assignedTo: true
		}
	});
	if (!row) return null;
	const admin = isSystemAdmin(userRoleId);
	if (!admin && row.requesterId !== userId) {
		throw error(403, 'You cannot view this ticket');
	}
	return row;
}

export async function updateSupportTicket(
	event: RequestEvent,
	payload: {
		id: number;
		status?: SupportTicketStatusEnum;
		assignedToUserId?: string | null;
		resolution?: string | null;
	}
): Promise<SupportTicketSchema> {
	const { userRoleId } = requireUser(event);
	if (!isSystemAdmin(userRoleId)) {
		throw error(403, 'Only system administrators can update tickets');
	}
	const { id, status, assignedToUserId, resolution } = payload;
	if (status !== undefined && !isSupportTicketStatus(String(status))) {
		throw error(400, 'Invalid status');
	}

	const patch: Record<string, unknown> = {};
	if (status !== undefined) patch.status = status;
	if (assignedToUserId !== undefined) {
		patch.assignedToUserId =
			assignedToUserId === '' || assignedToUserId === null
				? null
				: assignedToUserId;
	}
	if (resolution !== undefined) {
		patch.resolution = resolution?.trim() || null;
	}

	if (Object.keys(patch).length === 0) {
		throw error(400, 'No changes');
	}

	const [row] = await ensureDb()
		.update(table.supportTicketTable)
		.set(patch as never)
		.where(and(eq(table.supportTicketTable.id, id), activeTicketCondition))
		.returning();
	if (!row) throw error(404, 'Ticket not found');

	return row;
}

