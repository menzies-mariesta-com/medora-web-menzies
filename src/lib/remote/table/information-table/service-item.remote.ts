import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceItemSchema,
	ServiceItemSchemaInsert,
	ServiceItemSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

// get all (optionally filtered by hospitalId/subCategoryId)
export const getServiceItem = query(
	'unchecked' as const,
	async (params?: { hospitalId?: string | null; subCategoryId?: number | null }): Promise<
		ServiceItemSchema[]
	> => {
		const notDeleted = ne(table.serviceItemTable.statusId, StatusEnum.DELETED);
		let whereExpr = notDeleted;

		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = and(whereExpr, eq(table.serviceItemTable.hospitalId, params.hospitalId));
		}
		if (params?.subCategoryId != null) {
			whereExpr = and(whereExpr, eq(table.serviceItemTable.subCategoryId, params.subCategoryId));
		}

		return ensureDb()
			.select()
			.from(table.serviceItemTable)
			.where(whereExpr)
			.orderBy(table.serviceItemTable.serviceName);
	}
);

// get count
export const getServiceItemCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.serviceItemTable);
	return row?.count ?? 0;
});

// get paginated
export const getServiceItemPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams & { hospitalId?: string | null; subCategoryId?: number | null }): Promise<
		PaginatedResult<ServiceItemSchema>
	> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const notDeleted = ne(table.serviceItemTable.statusId, StatusEnum.DELETED);
		let whereExpr = notDeleted;

		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = and(whereExpr, eq(table.serviceItemTable.hospitalId, params.hospitalId));
		}
		if (params?.subCategoryId != null) {
			whereExpr = and(whereExpr, eq(table.serviceItemTable.subCategoryId, params.subCategoryId));
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.serviceItemTable)
				.where(whereExpr)
				.orderBy(table.serviceItemTable.serviceName)
				.limit(limit)
				.offset(offset),
			ensureDb().select({ count: count() }).from(table.serviceItemTable).where(whereExpr),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get one
export const getServiceItemById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ServiceItemSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.serviceItemTable)
			.where(eq(table.serviceItemTable.id, id));
		return row ?? null;
	}
);

// create
export const createServiceItem = command(
	'unchecked' as const,
	async (payload: ServiceItemSchemaInsert): Promise<ServiceItemSchema> => {
		const [row] = await ensureDb()
			.insert(table.serviceItemTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getServiceItem(undefined).refresh();
		getServiceItemCount().refresh();
		getServiceItemPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateServiceItem = command(
	'unchecked' as const,
	async (payload: ServiceItemSchemaUpdate & { id: number }): Promise<ServiceItemSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.serviceItemTable)
			.set(rest as ServiceItemSchemaUpdate)
			.where(eq(table.serviceItemTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getServiceItem(undefined).refresh();
		getServiceItemCount().refresh();
		getServiceItemPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteServiceItem = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.serviceItemTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.serviceItemTable.id, id));
		getServiceItem(undefined).refresh();
		getServiceItemCount().refresh();
		getServiceItemPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteServiceItemComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.serviceItemTable).where(eq(table.serviceItemTable.id, id));
		getServiceItem(undefined).refresh();
		getServiceItemCount().refresh();
		getServiceItemPaginated(undefined).refresh();
	}
);
