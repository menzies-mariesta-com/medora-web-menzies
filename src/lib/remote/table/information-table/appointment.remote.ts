import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AppointmentSchema,
	AppointmentSchemaInsert,
	AppointmentSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getAppointment = query(async (): Promise<AppointmentSchema[]> => {
	const data = await ensureDb().select().from(table.appointmentTable);
	return data;
});

// get count
export const getAppointmentCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.appointmentTable);
	return row?.count ?? 0;
});

// get paginated
export const getAppointmentPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<AppointmentSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.appointmentTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.appointmentTable),
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
export const getAppointmentWithRelations = query(async () => {
	return ensureDb().query.appointmentTable.findMany({
		with: {
			patient: true,
			staff: true,
			patientTitle: true,
			referType: true,
			externalRefer: true,
			statusTagging: true,
			status: true,
		},
	});
});

// get one
export const getAppointmentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<AppointmentSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.appointmentTable)
			.where(eq(table.appointmentTable.id, id));
		return row ?? null;
	}
);

// create
export const createAppointment = command(
	'unchecked' as const,
	async (payload: AppointmentSchemaInsert): Promise<AppointmentSchema> => {
		const [row] = await ensureDb()
			.insert(table.appointmentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getAppointment().refresh();
		return row;
	}
);

// update
export const updateAppointment = command(
	'unchecked' as const,
	async (payload: AppointmentSchemaUpdate & { id: number }): Promise<AppointmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.appointmentTable)
			.set(rest as AppointmentSchemaUpdate)
			.where(eq(table.appointmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getAppointment().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteAppointment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.appointmentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.appointmentTable.id, id));
		getAppointment().refresh();
	}
);

// delete complete (hard)
export const deleteAppointmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.appointmentTable).where(eq(table.appointmentTable.id, id));
		getAppointment().refresh();
	}
);
