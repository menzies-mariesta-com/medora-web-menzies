import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ReferHistorySchema,
	ReferHistorySchemaInsert
} from '$lib/server/db/schema-type';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	ne,
	or,
	sql
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { YesNoEnum } from '$lib/model/enum/db-link';
import { ReferNotificationEventType } from '$lib/model/enum/refer-notification-event.enum';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

type PaginatedResult<T> = {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

type PaginationParams = {
	page?: number;
	pageSize?: number;
	limit?: number;
	offset?: number;
	search?: string;
};

function normalizePagination(params?: PaginationParams): {
	page: number;
	pageSize: number;
	limit: number;
	offset: number;
} {
	const page = Math.max(
		1,
		Math.floor(Number(params?.page ?? 1) || 1)
	);
	const pageSize = Math.max(
		1,
		Math.floor(Number(params?.pageSize ?? 25) || 25)
	);
	const limit = Math.max(
		1,
		Math.floor(Number(params?.limit ?? pageSize) || pageSize)
	);
	const offset = Math.max(
		0,
		Math.floor(Number(params?.offset ?? (page - 1) * limit) || 0)
	);
	return { page, pageSize, limit, offset };
}

async function resolveReferrerStaffId(input: {
	fromReferDoctorId: string | null;
	createdBy: string | null;
}): Promise<string | null> {
	if (input.fromReferDoctorId) return input.fromReferDoctorId;
	if (!input.createdBy) return null;
	const [referrerStaff] = await ensureDb()
		.select({ id: table.staffTable.id })
		.from(table.staffTable)
		.where(eq(table.staffTable.userId, input.createdBy))
		.limit(1);
	return referrerStaff?.id ?? null;
}

export type ReferHistoryWithRelations = Awaited<
	ReturnType<typeof getReferHistoryWithRelations>
>[number];

export async function getReferHistoryWithRelations(input?: {
	visitId?: number;
}): Promise<
	Array<
		ReferHistorySchema & {
			visit: any;
			fromBranch: any;
			toBranch: any;
			fromReferDoctor: any;
			toReferDoctor: any;
			createdByUser: any;
			updatedByUser: any;
			cancelByUser: any;
		}
	>
> {
	let whereExpr: SQL | undefined;
	if (input?.visitId) {
		whereExpr = eq(table.referHistoryTable.visitId, input.visitId);
	}
	return ensureDb().query.referHistoryTable.findMany({
		where: whereExpr,
		with: {
			visit: {
				with: {
					patient: { with: { title: true, gender: true } }
				}
			},
			fromBranch: true,
			toBranch: true,
			fromReferDoctor: {
				with: { title: true, specialization: true }
			},
			toReferDoctor: { with: { title: true, specialization: true } },
			createdByUser: true,
			updatedByUser: true,
			cancelByUser: true
		},
		orderBy: [desc(table.referHistoryTable.createdAt)]
	}) as any;
}

export async function createReferHistory(
	event: RequestEvent,
	hospitalId: string,
	payload: ReferHistorySchemaInsert
): Promise<ReferHistorySchema> {
	await ensureCanAccessHospital(event, hospitalId);

	const sessionStaffId =
		event.locals?.staff?.id != null
			? String(event.locals.staff.id)
			: null;
	const fromReferDoctorId =
		payload.fromReferDoctorId ?? sessionStaffId ?? null;

	const [row] = await ensureDb()
		.insert(table.referHistoryTable)
		.values({ ...payload, fromReferDoctorId })
		.returning();

	if (!row) throw error(500, 'Insert failed');

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
		const link = `/heka/hospital/${hospitalId}/home/consultation/cpoe/refer/history`;

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

	return row;
}

export async function acceptReferHistory(
	event: RequestEvent,
	hospitalId: string,
	input: { id: number; replyNote?: string }
): Promise<ReferHistorySchema> {
	await ensureCanAccessHospital(event, hospitalId);

	const staffId =
		event.locals?.staff?.id != null
			? String(event.locals.staff.id)
			: null;
	if (!staffId) throw error(401, 'Unauthorized');

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
		.where(eq(table.referHistoryTable.id, input.id))
		.limit(1);

	if (!existing) throw error(404, 'Referral not found');
	if (
		existing.acceptAt != null &&
		String(existing.acceptAt).trim() !== ''
	) {
		throw error(400, 'Referral already accepted');
	}
	if (existing.cancelAt != null)
		throw error(400, 'Referral is cancelled');
	if (
		!existing.toReferDoctorId ||
		staffId !== String(existing.toReferDoctorId)
	) {
		throw error(
			403,
			'Only the receiving doctor can accept this referral'
		);
	}

	const nowIso = new Date().toISOString();
	const [row] = await ensureDb()
		.update(table.referHistoryTable)
		.set({ acceptAt: nowIso, referReplyNote: input.replyNote })
		.where(
			and(
				eq(table.referHistoryTable.id, input.id),
				isNull(table.referHistoryTable.acceptAt),
				isNull(table.referHistoryTable.cancelAt)
			)
		)
		.returning();

	if (!row) throw error(409, 'Could not accept referral');

	const recipientStaffId = await resolveReferrerStaffId({
		fromReferDoctorId: existing.fromReferDoctorId,
		createdBy: existing.createdBy
	});
	if (recipientStaffId) {
		const subject = row.subject?.trim();
		const message = subject
			? `Referral accepted: ${subject}`
			: 'Referral accepted.';
		const link = `/heka/hospital/${hospitalId}/home/consultation/cpoe/refer/history`;

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

	return row;
}

export async function rejectReferHistory(
	event: RequestEvent,
	hospitalId: string,
	input: { id: number; replyNote?: string }
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);

	const staffId =
		event.locals?.staff?.id != null
			? String(event.locals.staff.id)
			: null;
	if (!staffId) throw error(401, 'Unauthorized');

	const userId =
		event.locals?.user?.id != null
			? String(event.locals.user.id)
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
				eq(table.referHistoryTable.id, input.id),
				isNull(table.referHistoryTable.acceptAt),
				isNull(table.referHistoryTable.cancelAt)
			)
		)
		.limit(1);

	if (!existing) return;
	if (
		!existing.toReferDoctorId ||
		staffId !== String(existing.toReferDoctorId)
	) {
		throw error(
			403,
			'Only the receiving doctor can reject this referral'
		);
	}

	const cancelDate = new Date().toISOString();
	await ensureDb()
		.update(table.referHistoryTable)
		.set({
			cancelAt: cancelDate,
			referReplyNote: input.replyNote,
			cancelBy: userId
		})
		.where(
			and(
				eq(table.referHistoryTable.id, input.id),
				isNull(table.referHistoryTable.acceptAt),
				isNull(table.referHistoryTable.cancelAt)
			)
		)
		.returning();

	const recipientStaffId = await resolveReferrerStaffId({
		fromReferDoctorId: existing.fromReferDoctorId,
		createdBy: existing.createdBy
	});
	if (recipientStaffId) {
		const link = `/heka/hospital/${hospitalId}/home/consultation/cpoe/refer/history`;
		await ensureDb()
			.insert(table.notificationTable)
			.values({
				recipientStaffId,
				hospitalId,
				eventType: ReferNotificationEventType.REJECTED,
				severity: StatusColorEnum.ERROR,
				title: 'Referral rejected',
				message: `Referral rejected${input.replyNote ? `: ${input.replyNote}` : ''}`,
				link,
				visitId: existing.visitId,
				referHistoryId: input.id
			});
	}
}

export async function cancelReferHistory(
	event: RequestEvent,
	hospitalId: string,
	input: { id: number; cancelReason: string }
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);

	const cancelDate = new Date().toISOString();
	const userId =
		event.locals?.user?.id != null
			? String(event.locals.user.id)
			: null;

	const [existing] = await ensureDb()
		.select({
			visitId: table.referHistoryTable.visitId,
			toReferDoctorId: table.referHistoryTable.toReferDoctorId,
			fromReferDoctorId: table.referHistoryTable.fromReferDoctorId
		})
		.from(table.referHistoryTable)
		.where(
			and(
				eq(table.referHistoryTable.id, input.id),
				isNull(table.referHistoryTable.acceptAt),
				isNull(table.referHistoryTable.cancelAt)
			)
		)
		.limit(1);

	if (!existing) return;

	await ensureDb()
		.update(table.referHistoryTable)
		.set({
			cancelAt: cancelDate,
			cancelRemark: input.cancelReason,
			cancelBy: userId
		})
		.where(
			and(
				eq(table.referHistoryTable.id, input.id),
				isNull(table.referHistoryTable.acceptAt),
				isNull(table.referHistoryTable.cancelAt)
			)
		)
		.returning();

	const cancellerStaffId =
		event.locals?.staff?.id != null
			? String(event.locals.staff.id)
			: null;
	const fromId = existing.fromReferDoctorId;
	const toId = existing.toReferDoctorId;

	let recipientStaffId: string | null = null;
	if (cancellerStaffId && toId && cancellerStaffId === toId) {
		recipientStaffId = fromId ?? null;
	} else if (
		cancellerStaffId &&
		fromId &&
		cancellerStaffId === fromId
	) {
		recipientStaffId = toId ?? null;
	}

	if (recipientStaffId) {
		const link = `/heka/hospital/${hospitalId}/home/consultation/cpoe/refer/history`;
		await ensureDb()
			.insert(table.notificationTable)
			.values({
				recipientStaffId,
				hospitalId,
				eventType: ReferNotificationEventType.CANCELED,
				severity: StatusColorEnum.ERROR,
				title: 'Referral cancelled',
				message: `Referral cancelled: ${input.cancelReason}`,
				link,
				visitId: existing.visitId,
				referHistoryId: input.id
			});
	}
}

export async function getReferHistoryPaginated(input: {
	visitId?: number;
	page?: number;
	pageSize?: number;
	filters?: Record<string, string>;
}): Promise<PaginatedResult<ReferHistoryWithRelations>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(input);

	let whereExpr: SQL | undefined;
	if (input.visitId) {
		whereExpr = eq(table.referHistoryTable.visitId, input.visitId);
	}

	const filters = input.filters ?? {};

	const idStr = filters.id?.trim();
	if (idStr) {
		const n = Number(idStr);
		if (Number.isFinite(n) && n > 0) {
			const expr = eq(table.referHistoryTable.id, n);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}
	}

	const isUrgentStr = filters.isUrgent?.trim();
	if (isUrgentStr) {
		const n = Number(isUrgentStr);
		if (Number.isFinite(n) && (n === 0 || n === 1)) {
			const expr = eq(table.referHistoryTable.isUrgent, n);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}
	}

	const subject = filters.subject?.trim();
	if (subject) {
		const expr = ilike(
			table.referHistoryTable.subject,
			`%${subject}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

	const referAtFilter = filters.referAt?.trim();
	if (referAtFilter) {
		const expr = ilike(
			sql`${table.referHistoryTable.referAt}::text`,
			`%${referAtFilter}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

	const acceptAtFilter = filters.acceptAt?.trim();
	if (acceptAtFilter) {
		const expr = ilike(
			sql`${table.referHistoryTable.acceptAt}::text`,
			`%${acceptAtFilter}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

	const createdAtFilter = filters.createdAt?.trim();
	if (createdAtFilter) {
		const expr = ilike(
			sql`${table.referHistoryTable.createdAt}::text`,
			`%${createdAtFilter}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

	const updatedAtFilter = filters.updatedAt?.trim();
	if (updatedAtFilter) {
		const expr = ilike(
			sql`${table.referHistoryTable.updatedAt}::text`,
			`%${updatedAtFilter}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

	const referRequestNote = filters.referRequestNote?.trim();
	if (referRequestNote) {
		const expr = ilike(
			table.referHistoryTable.referRequestNote,
			`%${referRequestNote}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

	const referReplyNote = filters.referReplyNote?.trim();
	if (referReplyNote) {
		const expr = ilike(
			table.referHistoryTable.referReplyNote,
			`%${referReplyNote}%`
		);
		whereExpr = whereExpr ? and(whereExpr, expr) : expr;
	}

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
				fromReferDoctor: {
					with: { title: true, specialization: true }
				},
				toReferDoctor: {
					with: { title: true, specialization: true }
				},
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
