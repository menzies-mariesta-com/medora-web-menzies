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
import { and, count, eq, isNull, ne, desc, ilike, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

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
			toReferDoctor: { with: { title: true, specialization: true } }
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
		const [row] = await ensureDb()
			.insert(table.referHistoryTable)
			.values(payload)
			.returning();

		if (!row) throw new Error('Insert failed');

		getReferHistoryWithRelations().refresh();
		return row;
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
		const cancelDate = new Date().toISOString().split('T')[0];
		const userId =
			getRequestEvent()?.locals?.user?.id != null
				? String(getRequestEvent()?.locals?.user?.id)
				: null;

		await ensureDb()
			.update(table.referHistoryTable)
			.set({
				cancelAt: cancelDate,
				cancelRemark: cancelReason,
				...(userId ? { cancelBy: userId } : {})
			} as any)
			.where(
				and(
					eq(table.referHistoryTable.id, id),
					isNull(table.referHistoryTable.acceptDate),
					isNull(table.referHistoryTable.cancelAt)
				)
			);
	}
);

export const getReferHistoryPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			visitId?: number;
			/**
			 * MariTable column filter map: { [columnId]: string }.
			 * We apply a subset server-side for now.
			 */
			filters?: Record<string, string>;
		}
	): Promise<PaginatedResult<ReferHistoryWithRelations>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);

		let whereExpr: any;
		const visitId = params?.visitId;
		if (visitId) {
			whereExpr = eq(table.referHistoryTable.visitId, visitId);
		}

		const filters = params?.filters ?? {};

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

		// referDate (stored as DATE)
		const referDate = filters.referDate?.trim();
		if (referDate) {
			const expr = ilike(
				sql`${table.referHistoryTable.referDate}::text`,
				`%${referDate}%`
			);
			whereExpr = whereExpr ? and(whereExpr, expr) : expr;
		}

		// acceptDate (stored as DATE)
		const acceptDate = filters.acceptDate?.trim();
		if (acceptDate) {
			const expr = ilike(
				sql`${table.referHistoryTable.acceptDate}::text`,
				`%${acceptDate}%`
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
					toReferDoctor: { with: { title: true, specialization: true } }
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
