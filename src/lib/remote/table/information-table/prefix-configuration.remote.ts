import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PrefixFormatSchema,
	PrefixFormatSchemaInsert,
	PrefixFormatSchemaUpdate
} from '$lib/server/db/schema-type';
import { and, eq, isNull, sql } from 'drizzle-orm';

export const getPrefixConfigurationByHospital = query(
	'unchecked' as const,
	async ({
		hospitalId
	}: {
		hospitalId: string;
	}): Promise<PrefixFormatSchema[]> => {
		return ensureDb()
			.select()
			.from(table.prefixFormatTable)
			.where(
				and(
					eq(table.prefixFormatTable.hospitalId, hospitalId),
					isNull(table.prefixFormatTable.deletedAt)
				)
			);
	}
);

export const getPrefixConfigurationById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PrefixFormatSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.prefixFormatTable)
			.where(eq(table.prefixFormatTable.id, id));
		return row ?? null;
	}
);

export const createPrefixConfiguration = command(
	'unchecked' as const,
	async (
		input: PrefixFormatSchemaInsert
	): Promise<PrefixFormatSchema> => {
		const [inserted] = await ensureDb()
			.insert(table.prefixFormatTable)
			.values(input)
			.returning();
		return inserted;
	}
);

export const updatePrefixConfiguration = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: PrefixFormatSchemaUpdate & {
		id: number;
	}): Promise<PrefixFormatSchema> => {
		const [updated] = await ensureDb()
			.update(table.prefixFormatTable)
			.set(data)
			.where(eq(table.prefixFormatTable.id, id))
			.returning();
		return updated;
	}
);

export const deletePrefixConfiguration = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.prefixFormatTable)
			.set({ deletedAt: sql`now()` })
			.where(
				and(
					eq(table.prefixFormatTable.id, id),
					isNull(table.prefixFormatTable.deletedAt)
				)
			);
	}
);
