import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DoctorScheduleSchema,
	DoctorScheduleSchemaInsert,
	DoctorScheduleSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getDoctorSchedule = query(async (): Promise<DoctorScheduleSchema[]> => {
	const data = await ensureDb().select().from(table.doctorScheduleTable);
	return data;
});

// get count
export const getDoctorScheduleCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.doctorScheduleTable);
	return row?.count ?? 0;
});

// get paginated
export const getDoctorSchedulePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<DoctorScheduleSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.doctorScheduleTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.doctorScheduleTable),
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

// get all with relations
export const getDoctorScheduleWithRelations = query(async () => {
	return ensureDb().query.doctorScheduleTable.findMany({
		with: {
			doctor: true,
			hospital: true,
			weekday: true,
			status: true,
		},
	});
});

// get one
export const getDoctorScheduleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<DoctorScheduleSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.doctorScheduleTable)
			.where(eq(table.doctorScheduleTable.id, id));
		return row ?? null;
	}
);

// create
export const createDoctorSchedule = command(
	'unchecked' as const,
	async (payload: DoctorScheduleSchemaInsert): Promise<DoctorScheduleSchema> => {
		const [row] = await ensureDb()
			.insert(table.doctorScheduleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDoctorSchedule().refresh();
		return row;
	}
);

// update
export const updateDoctorSchedule = command(
	'unchecked' as const,
	async (payload: DoctorScheduleSchemaUpdate & { id: number }): Promise<DoctorScheduleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.doctorScheduleTable)
			.set(rest as DoctorScheduleSchemaUpdate)
			.where(eq(table.doctorScheduleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDoctorSchedule().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteDoctorSchedule = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.doctorScheduleTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.doctorScheduleTable.id, id));
		getDoctorSchedule().refresh();
	}
);

// delete complete (hard)
export const deleteDoctorScheduleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.doctorScheduleTable).where(eq(table.doctorScheduleTable.id, id));
		getDoctorSchedule().refresh();
	}
);
