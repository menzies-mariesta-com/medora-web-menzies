import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';

export type NotificationListItem = {
	id: number;
	eventType: string;
	severity: string;
	title: string | null;
	message: string;
	createdAt: string;
	readAt: string | null;
	hospitalId: string | null;
	visitId: number | null;
	referHistoryId: number | null;
	link: string | null;
};

function requireRecipientStaffId(event: RequestEvent): string {
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Unauthorized');
	return String(staffId);
}

export async function getNotificationUnreadCount(
	event: RequestEvent
): Promise<number> {
	const recipientStaffId = requireRecipientStaffId(event);
	const whereExpr = and(
		eq(table.notificationTable.recipientStaffId, recipientStaffId),
		ne(table.notificationTable.statusId, StatusEnum.DELETED),
		isNull(table.notificationTable.deletedAt),
		isNull(table.notificationTable.readAt)
	);
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.notificationTable)
		.where(whereExpr);
	return row?.count ?? 0;
}

export async function getNotificationsPaginated(
	event: RequestEvent,
	params?: PaginationParams & { read?: 'all' | 'unread' | 'read' }
): Promise<PaginatedResult<NotificationListItem>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const recipientStaffId = requireRecipientStaffId(event);

	const whereBase = and(
		eq(table.notificationTable.recipientStaffId, recipientStaffId),
		ne(table.notificationTable.statusId, StatusEnum.DELETED),
		isNull(table.notificationTable.deletedAt)
	);

	let whereExpr = whereBase;
	const readFilter = params?.read ?? 'all';
	if (readFilter === 'unread') {
		whereExpr = and(whereBase, isNull(table.notificationTable.readAt));
	} else if (readFilter === 'read') {
		whereExpr = and(whereBase, isNotNull(table.notificationTable.readAt));
	}

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.notificationTable.id,
				eventType: table.notificationTable.eventType,
				severity: table.notificationTable.severity,
				title: table.notificationTable.title,
				message: table.notificationTable.message,
				createdAt: table.notificationTable.createdAt,
				readAt: table.notificationTable.readAt,
				hospitalId: table.notificationTable.hospitalId,
				visitId: table.notificationTable.visitId,
				referHistoryId: table.notificationTable.referHistoryId,
				link: table.notificationTable.link
			})
			.from(table.notificationTable)
			.where(whereExpr)
			.orderBy(desc(table.notificationTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.notificationTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	return {
		data: data as NotificationListItem[],
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function markNotificationRead(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	const recipientStaffId = requireRecipientStaffId(event);
	await ensureDb()
		.update(table.notificationTable)
		.set({ readAt: new Date().toISOString() })
		.where(
			and(
				eq(table.notificationTable.id, input.id),
				eq(
					table.notificationTable.recipientStaffId,
					recipientStaffId
				),
				isNull(table.notificationTable.deletedAt)
			)
		);
}

export async function markAllNotificationsRead(
	event: RequestEvent
): Promise<void> {
	const recipientStaffId = requireRecipientStaffId(event);
	const whereExpr = and(
		eq(table.notificationTable.recipientStaffId, recipientStaffId),
		ne(table.notificationTable.statusId, StatusEnum.DELETED),
		isNull(table.notificationTable.deletedAt),
		isNull(table.notificationTable.readAt)
	);
	await ensureDb()
		.update(table.notificationTable)
		.set({ readAt: new Date().toISOString() })
		.where(whereExpr);
}
