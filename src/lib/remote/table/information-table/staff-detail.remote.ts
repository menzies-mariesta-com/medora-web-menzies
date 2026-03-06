import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffDetailSchema,
	StaffDetailSchemaInsert,
	StaffDetailSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffDetail = query(
	async (): Promise<StaffDetailSchema[]> => {
		const data = await ensureDb()
			.select()
			.from(table.staffDetailTable);
		return data;
	}
);

// get all with relations
export const getStaffDetailWithRelations = query(async () => {
	return ensureDb().query.staffDetailTable.findMany({
		with: {
			bloodType: true,
			status: true
		}
	});
});

export type StaffDetailWithRelations = Awaited<
	ReturnType<typeof getStaffDetailWithRelations>
>[number];

export const getStaffDetailByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return ensureDb().query.staffDetailTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				bloodType: true,
				status: true
			}
		});
	}
);

// get count
export const getStaffDetailCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.staffDetailTable);
		return row?.count ?? 0;
	}
);

// get paginated
export const getStaffDetailPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<StaffDetailSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.staffDetailTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.staffDetailTable)
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

// get one (without relations)
export const getStaffDetailById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<StaffDetailSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffDetailTable)
			.where(eq(table.staffDetailTable.id, id));
		return row ?? null;
	}
);

// get one with relations
export const getStaffDetailByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return ensureDb().query.staffDetailTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				bloodType: true,
				status: true
			}
		});
	}
);

// create
export const createStaffDetail = command(
	'unchecked' as const,
	async (
		payload: StaffDetailSchemaInsert
	): Promise<StaffDetailSchema> => {
		const [row] = await ensureDb()
			.insert(table.staffDetailTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffDetail().refresh();
		return row;
	}
);

// update
export const updateStaffDetail = command(
	'unchecked' as const,
	async (
		payload: { id: number } & StaffDetailSchemaUpdate
	): Promise<StaffDetailSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.staffDetailTable)
			.set(rest as StaffDetailSchemaUpdate)
			.where(eq(table.staffDetailTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffDetail().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStaffDetail = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.staffDetailTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffDetailTable.id, id));
		getStaffDetail().refresh();
	}
);

// delete complete (hard)
export const deleteStaffDetailComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.staffDetailTable)
			.where(eq(table.staffDetailTable.id, id));
		getStaffDetail().refresh();
	}
);
