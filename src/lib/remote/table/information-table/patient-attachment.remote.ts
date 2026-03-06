import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientAttachmentSchema,
	PatientAttachmentSchemaInsert,
	PatientAttachmentSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getPatientAttachment = query(
	async (): Promise<PatientAttachmentSchema[]> => {
		const data = await ensureDb()
			.select()
			.from(table.patientAttachmentTable);
		return data;
	}
);

// get all with relations
export const getPatientAttachmentWithRelations = query(async () => {
	return ensureDb().query.patientAttachmentTable.findMany({
		with: {
			patient: true,
			status: true
		}
	});
});

export type PatientAttachmentWithRelations = Awaited<
	ReturnType<typeof getPatientAttachmentWithRelations>
>[number];

// get count
export const getPatientAttachmentCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.patientAttachmentTable);
		return row?.count ?? 0;
	}
);

// get paginated
export const getPatientAttachmentPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<PatientAttachmentSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.patientAttachmentTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.patientAttachmentTable)
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

// get one
export const getPatientAttachmentById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PatientAttachmentSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientAttachmentTable)
			.where(eq(table.patientAttachmentTable.id, id));
		return row ?? null;
	}
);

// get by patient
export const getPatientAttachmentByPatientId = query(
	'unchecked' as const,
	async ({
		patientId
	}: {
		patientId: string;
	}): Promise<PatientAttachmentSchema[]> => {
		return ensureDb()
			.select()
			.from(table.patientAttachmentTable)
			.where(eq(table.patientAttachmentTable.patientId, patientId))
			.orderBy(table.patientAttachmentTable.id);
	}
);

// create
export const createPatientAttachment = command(
	'unchecked' as const,
	async (
		payload: PatientAttachmentSchemaInsert
	): Promise<PatientAttachmentSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientAttachmentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatientAttachment().refresh();
		return row;
	}
);

// update
export const updatePatientAttachment = command(
	'unchecked' as const,
	async (
		payload: {
			id: number;
		} & PatientAttachmentSchemaUpdate
	): Promise<PatientAttachmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.patientAttachmentTable)
			.set(rest as PatientAttachmentSchemaUpdate)
			.where(eq(table.patientAttachmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatientAttachment().refresh();
		return row;
	}
);

// delete (hard)
export const deletePatientAttachment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.patientAttachmentTable)
			.where(eq(table.patientAttachmentTable.id, id));
		getPatientAttachment().refresh();
	}
);

// delete complete (hard)
export const deletePatientAttachmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.patientAttachmentTable)
			.where(eq(table.patientAttachmentTable.id, id));
		getPatientAttachment().refresh();
	}
);
