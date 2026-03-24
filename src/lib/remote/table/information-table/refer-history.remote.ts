import { command, query, getRequestEvent } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ReferHistorySchema,
	ReferHistorySchemaInsert,
	ReferHistorySchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { error } from '@sveltejs/kit';
import { and, count, eq, isNull, desc, ilike, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { YesNoEnum } from '$lib/model/enum/db-link';
import { ReferNotificationEventType } from '$lib/model/enum/refer-notification-event.enum';

/** Doctor A (referrer) for notifications when `from_refer_doctorid` or legacy `created_by`. */
async function resolveReferrerStaffId(
	fromReferDoctorId: string | null,
	createdBy: string | null
): Promise<string | null> {
	if (fromReferDoctorId) return fromReferDoctorId;
	if (!createdBy) return null;
	const [referrerStaff] = await ensureDb()
		.select({ id: table.staffTable.id })
		.from(table.staffTable)
		.where(eq(table.staffTable.userId, createdBy))
		.limit(1);
	return referrerStaff?.id ?? null;
}

export const getReferHistoryWithRelations = query(async () => {
	return ensureDb().query.referHistoryTable.findMany({
		with: {
			visit: {
				with: {
					patient: { with: { title: true, gender: true } }
				}
			},
			fromBranch: true,
			toBranch: true,
			fromReferDoctor: { with: { title: true, specialization: true } },
			toReferDoctor: { with: { title: true, specialization: true } },
			createdByUser: true,
			updatedByUser: true,
			cancelByUser: true
		},
		orderBy: [desc(table.referHistoryTable.createdAt)]
	});
});

export type ReferHistoryWithRelations = Awaited<
	ReturnType<typeof getReferHistoryWithRelations>
>[number];

export const getReferHistory = query(async (): Promise<ReferHistorySchema[]> => {
	return ensureDb()
		.select()
		.from(table.referHistoryTable)
		.where(isNull(table.referHistoryTable.deletedAt)); // soft delete: only non-deleted rows
});

export const getReferHistoryById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ReferHistorySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.referHistoryTable)
			.where(eq(table.referHistoryTable.id, id));
		return row ?? null;
	}
);

export const createReferHistory = command(
	'unchecked' as const,
	async (payload: ReferHistorySchemaInsert): Promise<ReferHistorySchema> => {
		// UI historically omitted referring doctor; accept/cancel notifications need this FK.
		const sessionStaffId =
			getRequestEvent()?.locals?.staff?.id != null
				? String(getRequestEvent()!.locals!.staff!.id)
				: null;
		const fromReferDoctorId =
			payload.fromReferDoctorId ?? sessionStaffId ?? null;

		const [row] = await ensureDb()
			.insert(table.referHistoryTable)
			.values({
				...payload,
				fromReferDoctorId
			})
			.returning();

		if (!row) throw new Error('Insert failed');

		// Persist notifications for refer history creation.
		const hospitalIdRow = await ensureDb()
			.select({ hospitalId: table.patientVisitTable.hospitalId })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, row.visitId))
			.limit(1);
		const hospitalId = hospitalIdRow[0]?.hospitalId ?? null;

		// Notify only the receiving doctor (refer-to), not the referrer.
		const recipientStaffId = row.toReferDoctorId;
		if (recipientStaffId) {
			const isUrgent = row.isUrgent === YesNoEnum.YES;
			const severity = isUrgent
				? StatusColorEnum.WARNING
				: StatusColorEnum.INFO;
			const subject = row.subject?.trim();
			const message = subject
				? `New referral request: ${subject}${isUrgent ? ' (Urgent)' : ''}`
				: `New referral request${isUrgent ? ' (Urgent)' : ''}.`;
			const link = hospitalId
				? `/heka/hospital/${hospitalId}/home/cpoe/refer/history`
				: null;

			await ensureDb().insert(table.notificationTable).values({
				recipientStaffId,
				hospitalId,
				eventType: ReferNotificationEventType.CREATED,
				severity,
				title: 'Referral request',
				message,
				link,
				visitId: row.visitId,
				referHistoryId: row.id
			});
		}

		getReferHistoryWithRelations().refresh();
		return row;
	}
);

/**
 * Receiving doctor accepts a pending referral. Notifies referring doctor only.
 * Use this instead of `updateReferHistory` with `acceptDate`.
 */
export const acceptReferHistory = command(
	'unchecked' as const,
	async ({
		id,
		replyNote
	}: {
		id: number;
		replyNote?: string;
	}): Promise<ReferHistorySchema> => {
		const staffId =
			getRequestEvent()?.locals?.staff?.id != null
				? String(getRequestEvent()!.locals!.staff!.id)
				: null;
		if (!staffId) {
			throw error(401, 'Unauthorized');
		}

		const [existing] = await ensureDb()
			.select({
				acceptAt: table.referHistoryTable.acceptAt,
				cancelAt: table.referHistoryTable.cancelAt,
				toReferDoctorId: table.referHistoryTable.toReferDoctorId,
				fromReferDoctorId: table.referHistoryTable.fromReferDoctorId,
				visitId: table.referHistoryTable.visitId,
				subject: table.referHistoryTable.subject,
				createdBy: table.referHistoryTable.createdBy
			})
			.from(table.referHistoryTable)
			.where(eq(table.referHistoryTable.id, id))
			.limit(1);

		if (!existing) {
			throw error(404, 'Referral not found');
		}
		const alreadyAccepted =
			existing.acceptAt != null &&
			String(existing.acceptAt).trim() !== '';
		if (alreadyAccepted) {
			throw error(400, 'Referral already accepted');
		}
		if (existing.cancelAt != null) {
			throw error(400, 'Referral is cancelled');
		}
		if (
			!existing.toReferDoctorId ||
			staffId !== String(existing.toReferDoctorId)
		) {
			throw error(403, 'Only the receiving doctor can accept this referral');
		}

		const nowIso = new Date().toISOString();
		const [row] = await ensureDb()
			.update(table.referHistoryTable)
			.set({ acceptAt: nowIso, referReplyNote: replyNote })
			.where(
				and(
					eq(table.referHistoryTable.id, id),
					isNull(table.referHistoryTable.acceptAt),
					isNull(table.referHistoryTable.cancelAt)
				)
			)
			.returning();

		if (!row) {
			throw error(409, 'Could not accept referral');
		}

		const hospitalIdRow = await ensureDb()
			.select({ hospitalId: table.patientVisitTable.hospitalId })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, row.visitId))
			.limit(1);
		const hospitalId = hospitalIdRow[0]?.hospitalId ?? null;

		const recipientStaffId = await resolveReferrerStaffId(
			existing.fromReferDoctorId,
			existing.createdBy
		);
		if (recipientStaffId) {
			const subject = row.subject?.trim();
			const message = subject
				? `Referral accepted: ${subject}`
				: 'Referral accepted.';
			const link = hospitalId
				? `/heka/hospital/${hospitalId}/home/cpoe/refer/history`
				: null;

			await ensureDb().insert(table.notificationTable).values({
				recipientStaffId,
				hospitalId,
					eventType: ReferNotificationEventType.ACCEPTED,
				severity: StatusColorEnum.SUCCESS,
				title: 'Referral accepted',
				message,
				link,
				visitId: row.visitId,
				referHistoryId: row.id
			});
		}

		getReferHistoryWithRelations().refresh();
		return row;
	}
);

/**
 * Receiving doctor rejects a pending referral. Notifies referring doctor only.
 * Use this instead of `cancelReferHistory` for the Reject action.
 */
export const rejectReferHistory = command(
	'unchecked' as const,
	async ({
		id,
		replyNote
	}: {
		id: number;
		replyNote?: string;
	}): Promise<void> => {
		const staffId =
			getRequestEvent()?.locals?.staff?.id != null
				? String(getRequestEvent()!.locals!.staff!.id)
				: null;
		if (!staffId) {
			throw error(401, 'Unauthorized');
		}

		const cancelDate = new Date().toISOString();
		const userId =
			getRequestEvent()?.locals?.user?.id != null
				? String(getRequestEvent()?.locals?.user?.id)
				: null;

		const [existing] = await ensureDb()
			.select({
				visitId: table.referHistoryTable.visitId,
				toReferDoctorId: table.referHistoryTable.toReferDoctorId,
				fromReferDoctorId: table.referHistoryTable.fromReferDoctorId,
				createdBy: table.referHistoryTable.createdBy
			})
			.from(table.referHistoryTable)
			.where(
				and(
					eq(table.referHistoryTable.id, id),
					isNull(table.referHistoryTable.acceptAt),
					isNull(table.referHistoryTable.cancelAt)
				)
			)
			.limit(1);

		if (!existing) {
			return;
		}
		if (
			!existing.toReferDoctorId ||
			staffId !== String(existing.toReferDoctorId)
		) {
			throw error(403, 'Only the receiving doctor can reject this referral');
		}

		await ensureDb()
			.update(table.referHistoryTable)
			.set({
				cancelAt: cancelDate,
				referReplyNote: replyNote,
				cancelBy: userId
			})
			.where(
				and(
					eq(table.referHistoryTable.id, id),
					isNull(table.referHistoryTable.acceptAt),
					isNull(table.referHistoryTable.cancelAt)
				)
			)
			.returning();

		const hospitalIdRow = await ensureDb()
			.select({ hospitalId: table.patientVisitTable.hospitalId })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, existing.visitId))
			.limit(1);
		const hospitalId = hospitalIdRow[0]?.hospitalId ?? null;

		const recipientStaffId = await resolveReferrerStaffId(
			existing.fromReferDoctorId,
			existing.createdBy
		);

		if (recipientStaffId) {
			const link = hospitalId
				? `/heka/hospital/${hospitalId}/home/cpoe/refer/history`
				: null;

			await ensureDb().insert(table.notificationTable).values({
				recipientStaffId,
				hospitalId,
				eventType: ReferNotificationEventType.REJECTED,
				severity: StatusColorEnum.ERROR,
				title: 'Referral rejected',
				message: `Referral rejected${replyNote ? `: ${replyNote}` : ''}`,
				link,
				visitId: existing.visitId,
				referHistoryId: id
			});
		}

		getReferHistoryWithRelations().refresh();
	}
);

export const updateReferHistory = command(
	'unchecked' as const,
	async (
		payload: { id: number } & ReferHistorySchemaUpdate
	): Promise<ReferHistorySchema> => {
		const { id, ...rest } = payload;

		const [row] = await ensureDb()
			.update(table.referHistoryTable)
			.set(rest)
			.where(eq(table.referHistoryTable.id, id))
			.returning();

		if (!row) throw new Error('Update failed');

		getReferHistoryWithRelations().refresh();
		return row;
	}
);

export const cancelReferHistory = command(
	'unchecked' as const,
	async (payload: { id: number; cancelReason: string }): Promise<void> => {
		const { id, cancelReason } = payload;
		const cancelDate = new Date().toISOString();
		const userId =
			getRequestEvent()?.locals?.user?.id != null
				? String(getRequestEvent()?.locals?.user?.id)
				: null;

		// Load refer row first to determine notification recipients and ensure idempotency.
		const existing = await ensureDb()
			.select({
				visitId: table.referHistoryTable.visitId,
				toReferDoctorId: table.referHistoryTable.toReferDoctorId,
				fromReferDoctorId: table.referHistoryTable.fromReferDoctorId
			})
			.from(table.referHistoryTable)
			.where(
				and(
					eq(table.referHistoryTable.id, id),
					isNull(table.referHistoryTable.acceptAt),
					isNull(table.referHistoryTable.cancelAt)
				)
			)
			.limit(1);

		if (existing.length === 0) return;

		await ensureDb()
			.update(table.referHistoryTable)
			.set({
				cancelAt: cancelDate,
				cancelRemark: cancelReason,
				cancelBy: userId
			})
			.where(
				and(
					eq(table.referHistoryTable.id, id),
					isNull(table.referHistoryTable.acceptAt),
					isNull(table.referHistoryTable.cancelAt)
				)
			)
			.returning();

		const hospitalIdRow = await ensureDb()
			.select({ hospitalId: table.patientVisitTable.hospitalId })
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, existing[0].visitId))
			.limit(1);
		const hospitalId = hospitalIdRow[0]?.hospitalId ?? null;

		// Doctor B rejects → notify only Doctor A. Doctor A cancels → notify only Doctor B.
		const cancellerStaffId =
			getRequestEvent()?.locals?.staff?.id != null
				? String(getRequestEvent()?.locals?.staff?.id)
				: null;
		const fromId = existing[0].fromReferDoctorId;
		const toId = existing[0].toReferDoctorId;

		let recipientStaffId: string | null = null;
		if (cancellerStaffId && toId && cancellerStaffId === toId) {
			recipientStaffId = fromId ?? null;
		} else if (cancellerStaffId && fromId && cancellerStaffId === fromId) {
			recipientStaffId = toId ?? null;
		}

		if (recipientStaffId) {
			const link = hospitalId
				? `/heka/hospital/${hospitalId}/home/cpoe/refer/history`
				: null;

			const message = `Referral cancelled: ${cancelReason}`;

			await ensureDb().insert(table.notificationTable).values({
				recipientStaffId,
				hospitalId,
				eventType: ReferNotificationEventType.CANCELED,
				severity: StatusColorEnum.ERROR,
				title: 'Referral cancelled',
				message,
				link,
				visitId: existing[0].visitId,
				referHistoryId: id
			});
		}

		getReferHistoryWithRelations().refresh();
	}
);

export const getReferHistoryPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			filters?: Record<string, string>;
			visitId?: number;
		}
	): Promise<PaginatedResult<ReferHistoryWithRelations>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);

		let whereExpr: SQL | undefined;
		const visitId = params?.visitId;
		if (visitId) {
			whereExpr = eq(table.referHistoryTable.visitId, visitId);
		}

		const filters = params?.filters ?? {};

		// id (exact)
		const idStr = filters.id?.trim();
		if (idStr) {
			const n = Number(idStr);
			if (Number.isFinite(n) && n > 0) {
				const expr = eq(table.referHistoryTable.id, n);
				whereExpr = whereExpr ? and(whereExpr, expr) : expr;
			}
		}

		// isUrgent (select filter)
		const isUrgentStr = filters.isUrgent?.trim();
		if (isUrgentStr) {
			const n = Number(isUrgentStr);
			if (Number.isFinite(n) && (n === 0 || n === 1)) {
				const expr = eq(table.referHistoryTable.isUrgent, n);
				whereExpr = whereExpr ? and(whereExpr, expr) : expr;
			}
		}

		// subject (text input filter)
		const subject = filters.subject?.trim();
		if (subject) {
			const expr = ilike(table.referHistoryTable.subject, `%${subject}%`);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// referAt (timestamptz)
		const referAtFilter = filters.referAt?.trim();
		if (referAtFilter) {
			const expr = ilike(
				sql`${table.referHistoryTable.referAt}::text`,
				`%${referAtFilter}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// acceptAt (timestamptz)
		const acceptAtFilter = filters.acceptAt?.trim();
		if (acceptAtFilter) {
			const expr = ilike(
				sql`${table.referHistoryTable.acceptAt}::text`,
				`%${acceptAtFilter}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// createdAt
		const createdAtFilter = filters.createdAt?.trim();
		if (createdAtFilter) {
			const expr = ilike(
				sql`${table.referHistoryTable.createdAt}::text`,
				`%${createdAtFilter}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// updatedAt
		const updatedAtFilter = filters.updatedAt?.trim();
		if (updatedAtFilter) {
			const expr = ilike(
				sql`${table.referHistoryTable.updatedAt}::text`,
				`%${updatedAtFilter}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// referRequestNote (text)
		const referRequestNote = filters.referRequestNote?.trim();
		if (referRequestNote) {
			const expr = ilike(
				table.referHistoryTable.referRequestNote,
				`%${referRequestNote}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// referReplyNote (text)
		const referReplyNote = filters.referReplyNote?.trim();
		if (referReplyNote) {
			const expr = ilike(
				table.referHistoryTable.referReplyNote,
				`%${referReplyNote}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// cancelRemark
		const cancelRemark = filters.cancelRemark?.trim();
		if (cancelRemark) {
			const expr = ilike(
				table.referHistoryTable.cancelRemark,
				`%${cancelRemark}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb().query.referHistoryTable.findMany({
				where: whereExpr,
				with: {
					visit: {
						with: {
							patient: { with: { title: true, gender: true } }
						}
					},
					fromBranch: true,
					toBranch: true,
					fromReferDoctor: { with: { title: true, specialization: true } },
					toReferDoctor: { with: { title: true, specialization: true } },
					createdByUser: true,
					updatedByUser: true,
					cancelByUser: true
				},
				orderBy: [desc(table.referHistoryTable.createdAt)],
				limit,
				offset
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.referHistoryTable)
				.where(whereExpr)
		]);

		const total = countResult[0]?.count ?? 0;

		return {
			data: data as ReferHistoryWithRelations[],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1
		};
	}
);
