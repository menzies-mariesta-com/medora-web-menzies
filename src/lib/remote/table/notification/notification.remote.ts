import { command, getRequestEvent, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { error } from '@sveltejs/kit';
import { and, count, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

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

function requireRecipientStaffId(): string {
	const staffId = getRequestEvent()?.locals?.staff?.id;
	if (!staffId) throw error(401, 'Unauthorized');
	return String(staffId);
}

/**
 * Notifications are filtered by recipient staff only.
 * We intentionally do not filter by `hospital_id` here so the bell badge matches
 * all unread rows for this user (hospital-scoped filtering hid valid notifications
 * when route hospital and stored hospital differed).
 */
export const getNotificationUnreadCount = query(
	'unchecked' as const,
	async (): Promise<number> => {
		const recipientStaffId = requireRecipientStaffId();

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
);

export const getNotificationsLatest = query(
	'unchecked' as const,
	async (
		params?: { hospitalId?: string; limit?: number }
	): Promise<NotificationListItem[]> => {
		const limit = Math.max(1, Math.min(20, params?.limit ?? 5));
		const recipientStaffId = requireRecipientStaffId();

		const whereExpr = and(
			eq(table.notificationTable.recipientStaffId, recipientStaffId),
			ne(table.notificationTable.statusId, StatusEnum.DELETED),
			isNull(table.notificationTable.deletedAt)
		);

		const data = await ensureDb()
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
			.limit(limit);

		return data as NotificationListItem[];
	}
);

export const getNotificationsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			read?: 'all' | 'unread' | 'read';
		}
	): Promise<PaginatedResult<NotificationListItem>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const recipientStaffId = requireRecipientStaffId();

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
			whereExpr = and(
				whereBase,
				sql`${table.notificationTable.readAt} IS NOT NULL`
			);
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
);

export const markNotificationRead = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const recipientStaffId = requireRecipientStaffId();
		await ensureDb()
			.update(table.notificationTable)
			.set({ readAt: new Date().toISOString() })
			.where(
				and(
					eq(table.notificationTable.id, id),
					eq(table.notificationTable.recipientStaffId, recipientStaffId),
					isNull(table.notificationTable.deletedAt)
				)
			);
	}
);

export const markAllNotificationsRead = command(
	'unchecked' as const,
	async (): Promise<void> => {
		const recipientStaffId = requireRecipientStaffId();

		const whereExpr = and(
			eq(
				table.notificationTable.recipientStaffId,
				recipientStaffId
			),
			ne(table.notificationTable.statusId, StatusEnum.DELETED),
			isNull(table.notificationTable.deletedAt),
			isNull(table.notificationTable.readAt)
		);

		await ensureDb()
			.update(table.notificationTable)
			.set({ readAt: new Date().toISOString() })
			.where(whereExpr);
	}
);

