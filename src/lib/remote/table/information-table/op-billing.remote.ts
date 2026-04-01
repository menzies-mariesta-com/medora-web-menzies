import { query, command } from '$app/server';
import { db, ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	OpBillingSchema,
	OpBillingSchemaInsert,
	OpBillingSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { getOpBillingLine } from '$lib/remote/table/information-table/op-billing-line.remote';
import { and, asc, count, eq, isNull, ne } from 'drizzle-orm';

const notBillingDeleted = ne(
	table.opBillingTable.statusId,
	StatusEnum.DELETED
);

export const getOpBilling = query(
	'unchecked' as const,
	async (params?: {
		visitId?: number | null;
		hospitalId?: string | null;
		branchId?: string | null;
		id?: number | null;
		statusId?: number | null;
		billNo?: string | null;
	}): Promise<OpBillingSchema[]> => {
		let whereExpr = notBillingDeleted;

		if (params?.visitId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.visitId, params.visitId)
			) as typeof whereExpr;
		}
		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.hospitalId, params.hospitalId)
			) as typeof whereExpr;
		}
		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.branchId, params.branchId)
			) as typeof whereExpr;
		}
		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.id, params.id)
			) as typeof whereExpr;
		}
		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.statusId, params.statusId)
			) as typeof whereExpr;
		}
		if (params?.billNo != null && params.billNo.trim() !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.billNo, params.billNo.trim())
			) as typeof whereExpr;
		}

		return ensureDb()
			.select()
			.from(table.opBillingTable)
			.where(whereExpr)
			.orderBy(asc(table.opBillingTable.id));
	}
);

export const getOpBillingCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.opBillingTable)
		.where(notBillingDeleted);
	return row?.count ?? 0;
});

export const getOpBillingPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			visitId?: number | null;
			hospitalId?: string | null;
			branchId?: string | null;
			id?: number | null;
			statusId?: number | null;
			billNo?: string | null;
		}
	): Promise<PaginatedResult<OpBillingSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		let whereExpr = notBillingDeleted;

		if (params?.visitId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.visitId, params.visitId)
			) as typeof whereExpr;
		}
		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.hospitalId, params.hospitalId)
			) as typeof whereExpr;
		}
		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.branchId, params.branchId)
			) as typeof whereExpr;
		}
		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.id, params.id)
			) as typeof whereExpr;
		}
		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.statusId, params.statusId)
			) as typeof whereExpr;
		}
		if (params?.billNo != null && params.billNo.trim() !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.opBillingTable.billNo, params.billNo.trim())
			) as typeof whereExpr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.opBillingTable)
				.where(whereExpr)
				.orderBy(asc(table.opBillingTable.id))
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.opBillingTable)
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

export const getOpBillingById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<OpBillingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.opBillingTable)
			.where(
				and(
					eq(table.opBillingTable.id, id),
					notBillingDeleted
				)
			);
		return row ?? null;
	}
);

/** Bill header with active lines and common relations (for UI / print). */
export const getOpBillingByIdWithLines = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		const row = await ensureDb().query.opBillingTable.findFirst({
			where: and(
				eq(table.opBillingTable.id, id),
				notBillingDeleted
			),
			with: {
				lines: {
					where: isNull(table.opBillingLineTable.deletedAt),
					orderBy: [asc(table.opBillingLineTable.lineIndex)]
				},
				discountType: true,
				visit: true,
				hospital: true,
				branch: true,
				status: true
			}
		});
		return row ?? null;
	}
);

export type OpBillingWithLines = NonNullable<
	Awaited<ReturnType<typeof getOpBillingByIdWithLines>>
>;

function refreshOpBillingQueries(): void {
	getOpBilling(undefined).refresh();
	getOpBillingCount().refresh();
	getOpBillingPaginated(undefined).refresh();
}

export const createOpBilling = command(
	'unchecked' as const,
	async (payload: OpBillingSchemaInsert): Promise<OpBillingSchema> => {
		const [row] = await ensureDb()
			.insert(table.opBillingTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		refreshOpBillingQueries();
		return row;
	}
);

export const updateOpBilling = command(
	'unchecked' as const,
	async (
		payload: OpBillingSchemaUpdate & { id: number }
	): Promise<OpBillingSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.opBillingTable)
			.set(rest as OpBillingSchemaUpdate)
			.where(eq(table.opBillingTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		refreshOpBillingQueries();
		return row;
	}
);

export const deleteOpBilling = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.opBillingTable)
			.where(eq(table.opBillingTable.id, id));
		refreshOpBillingQueries();
		getOpBillingLine(undefined).refresh();
	}
);

export const deleteOpBillingComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		if (!db) throw new Error('DATABASE_URL is not set');
		await db.delete(table.opBillingTable).where(eq(table.opBillingTable.id, id));
		refreshOpBillingQueries();
		getOpBillingLine(undefined).refresh();
	}
);
