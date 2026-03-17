import { prerender, query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffTypeSchema,
	StaffTypeSchemaInsert,
	StaffTypeSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getStaffType = prerender(
	async (): Promise<StaffTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.staffTypeTable)
			.where(ne(table.staffTypeTable.statusId, StatusEnum.DELETED))
			.orderBy(table.staffTypeTable.name);
	},
	{ dynamic: true }
);

export const getStaffTypeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.staffTypeTable)
		.where(ne(table.staffTypeTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getStaffTypePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<StaffTypeSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.staffTypeTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.staffTypeTable)
				.where(notDeletedFilter)
				.orderBy(table.staffTypeTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.staffTypeTable)
				.where(notDeletedFilter)
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

export const getStaffTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffTypeTable)
			.where(
				and(
					eq(table.staffTypeTable.id, id),
					ne(table.staffTypeTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createStaffType = command(
	'unchecked' as const,
	async (
		payload: StaffTypeSchemaInsert
	): Promise<StaffTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.staffTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffType().refresh();
		return row;
	}
);

export const updateStaffType = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
	}): Promise<StaffTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.staffTypeTable)
			.set(rest as StaffTypeSchemaUpdate)
			.where(eq(table.staffTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffType().refresh();
		return row;
	}
);

export const deleteStaffType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.staffTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffTypeTable.id, id));
		getStaffType().refresh();
	}
);

export const deleteStaffTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.staffTypeTable)
			.where(eq(table.staffTypeTable.id, id));
		getStaffType().refresh();
	}
);
