import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	FinancialYearSchema,
	FinancialYearSchemaInsert,
	FinancialYearSchemaUpdate
} from '$lib/server/db/schema-type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

export async function getFinancialYearsByHospital(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<FinancialYearSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);
	return ensureDb()
		.select()
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, input.hospitalId),
				isNull(table.financialYearTable.deletedAt)
			)
		);
}

export async function createFinancialYear(
	event: RequestEvent,
	input: FinancialYearSchemaInsert
): Promise<FinancialYearSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [inserted] = await ensureDb()
		.insert(table.financialYearTable)
		.values(input)
		.returning();
	if (!inserted) throw new Error('Failed to create financial year');
	return inserted;
}

export async function updateFinancialYear(
	event: RequestEvent,
	input: FinancialYearSchemaUpdate & { id: number }
): Promise<FinancialYearSchema> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.financialYearTable.hospitalId })
		.from(table.financialYearTable)
		.where(eq(table.financialYearTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Financial year not found');
	await ensureCanAccessHospital(event, row.hospitalId);

	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.financialYearTable)
		.set(data)
		.where(eq(table.financialYearTable.id, id))
		.returning();
	if (!updated) throw new Error('Failed to update financial year');
	return updated;
}

export async function deleteFinancialYear(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.financialYearTable.hospitalId })
		.from(table.financialYearTable)
		.where(eq(table.financialYearTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Financial year not found');
	await ensureCanAccessHospital(event, row.hospitalId);

	await ensureDb()
		.update(table.financialYearTable)
		.set({ deletedAt: sql`now()` })
		.where(
			and(
				eq(table.financialYearTable.id, input.id),
				isNull(table.financialYearTable.deletedAt)
			)
		);
}

