import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AppointmentBlockSchema,
	AppointmentBlockSchemaInsert,
	AppointmentBlockSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, eq } from 'drizzle-orm';

/** Get all appointment blocks, optionally filtered by staffId and/or hospitalId. Excludes deleted. */
export const getAppointmentBlock = query(
	'unchecked' as const,
	async (params?: {
		staffId?: string;
		hospitalId?: number;
	}): Promise<AppointmentBlockSchema[]> => {
		const conditions = [eq(table.appointmentBlockTable.statusId, StatusEnum.ACTIVE)];
		if (params?.staffId != null && params.staffId !== '') {
			conditions.push(eq(table.appointmentBlockTable.staffId, params.staffId));
		}
		if (params?.hospitalId != null && Number.isInteger(params.hospitalId)) {
			conditions.push(eq(table.appointmentBlockTable.hospitalId, params.hospitalId));
		}
		return ensureDb()
			.select()
			.from(table.appointmentBlockTable)
			.where(and(...conditions));
	}
);

/** Create an appointment block. */
export const createAppointmentBlock = command(
	'unchecked' as const,
	async (payload: AppointmentBlockSchemaInsert): Promise<AppointmentBlockSchema> => {
		const [row] = await ensureDb()
			.insert(table.appointmentBlockTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getAppointmentBlock().refresh();
		return row;
	}
);

/** Update an appointment block. */
export const updateAppointmentBlock = command(
	'unchecked' as const,
	async (
		payload: AppointmentBlockSchemaUpdate & { id: number }
	): Promise<AppointmentBlockSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.appointmentBlockTable)
			.set(rest as AppointmentBlockSchemaUpdate)
			.where(eq(table.appointmentBlockTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getAppointmentBlock().refresh();
		return row;
	}
);

/** Soft-delete an appointment block (set status to DELETED). */
export const deleteAppointmentBlock = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.appointmentBlockTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.appointmentBlockTable.id, id));
		getAppointmentBlock().refresh();
	}
);
