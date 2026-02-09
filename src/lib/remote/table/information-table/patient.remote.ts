import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientSchema,
	PatientSchemaInsert,
	PatientSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getPatient = query(async (): Promise<PatientSchema[]> => {
	const data = await ensureDb().select().from(table.patientTable);
	return data;
});

// get all with relations
export const getPatientWithRelations = query(async () => {
	return ensureDb().query.patientTable.findMany({
		with: {
			user: true,
			maritalStatus: true,
			gender: true,
			identityType: true,
			bloodType: true,
			city: true,
			state: true,
			country: true,
			status: true,
			attachments: true,
			insurances: { with: { insurance: true } },
			allergies: true,
		},
	});
});

// get count
export const getPatientCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.patientTable);
	return row?.count ?? 0;
});

// get paginated
export const getPatientPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<PatientSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.patientTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.patientTable),
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
export const getPatientById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<PatientSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientTable)
			.where(eq(table.patientTable.id, id));
		return row ?? null;
	}
);

// get one with relations
export const getPatientByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: string }) => {
		return ensureDb().query.patientTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				user: true,
				maritalStatus: true,
				gender: true,
				identityType: true,
				bloodType: true,
				city: true,
				state: true,
				country: true,
				status: true,
				attachments: true,
				insurances: { with: { insurance: true } },
				allergies: true,
			},
		});
	}
);

// create
export const createPatient = command(
	'unchecked' as const,
	async (payload: PatientSchemaInsert): Promise<PatientSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatient().refresh();
		return row;
	}
);

// update
export const updatePatient = command(
	'unchecked' as const,
	async (payload: { id: string } & PatientSchemaUpdate): Promise<PatientSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.patientTable)
			.set(rest as PatientSchemaUpdate)
			.where(eq(table.patientTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatient().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePatient = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb()
			.update(table.patientTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.patientTable.id, id));
		getPatient().refresh();
	}
);

// delete complete (hard)
export const deletePatientComplete = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb().delete(table.patientTable).where(eq(table.patientTable.id, id));
		getPatient().refresh();
	}
);

