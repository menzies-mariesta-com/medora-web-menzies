import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	FinancialYearSchema,
	FinancialYearSchemaInsert,
	FinancialYearSchemaUpdate
} from '$lib/server/db/schema-type';
import { and, eq } from 'drizzle-orm';

export const getFinancialYearByHospital = query(
	'unchecked' as const,
	async ({
		hospitalId
	}: {
		hospitalId: string;
	}): Promise<FinancialYearSchema[]> => {
		return ensureDb()
			.select()
			.from(table.financialYearTable)
			.where(eq(table.financialYearTable.hospitalId, hospitalId));
	}
);

export const getFinancialYearById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<FinancialYearSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.financialYearTable)
			.where(eq(table.financialYearTable.id, id));
		return row ?? null;
	}
);

export const createFinancialYear = command(
	'unchecked' as const,
	async (
		input: FinancialYearSchemaInsert
	): Promise<FinancialYearSchema> => {
		const [inserted] = await ensureDb()
			.insert(table.financialYearTable)
			.values(input)
			.returning();
		return inserted;
	}
);

export const updateFinancialYear = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: FinancialYearSchemaUpdate & {
		id: number;
	}): Promise<FinancialYearSchema> => {
		const [updated] = await ensureDb()
			.update(table.financialYearTable)
			.set(data)
			.where(eq(table.financialYearTable.id, id))
			.returning();
		return updated;
	}
);

export const deleteFinancialYear = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb()
			.update(table.financialYearTable)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(table.financialYearTable.id, id),
					table.financialYearTable.deletedAt.isNull()
				)
			);
	}
);

