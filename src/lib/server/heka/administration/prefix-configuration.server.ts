import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PrefixFormatSchema,
	PrefixFormatSchemaInsert,
	PrefixFormatSchemaUpdate
} from '$lib/server/db/schema-type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

export async function getPrefixConfigurationByHospital(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<PrefixFormatSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);
	return ensureDb()
		.select()
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, input.hospitalId),
				isNull(table.prefixFormatTable.deletedAt)
			)
		);
}

export async function createPrefixConfiguration(
	event: RequestEvent,
	input: PrefixFormatSchemaInsert
): Promise<PrefixFormatSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [inserted] = await ensureDb()
		.insert(table.prefixFormatTable)
		.values(input)
		.returning();
	if (!inserted) throw new Error('Failed to create prefix configuration');
	return inserted;
}

export async function updatePrefixConfiguration(
	event: RequestEvent,
	input: PrefixFormatSchemaUpdate & { id: number }
): Promise<PrefixFormatSchema> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.prefixFormatTable.hospitalId })
		.from(table.prefixFormatTable)
		.where(eq(table.prefixFormatTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Prefix configuration not found');
	await ensureCanAccessHospital(event, row.hospitalId);

	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.prefixFormatTable)
		.set(data)
		.where(eq(table.prefixFormatTable.id, id))
		.returning();
	if (!updated) throw new Error('Failed to update prefix configuration');
	return updated;
}

export async function deletePrefixConfiguration(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.prefixFormatTable.hospitalId })
		.from(table.prefixFormatTable)
		.where(eq(table.prefixFormatTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'Prefix configuration not found');
	await ensureCanAccessHospital(event, row.hospitalId);

	await ensureDb()
		.update(table.prefixFormatTable)
		.set({ deletedAt: sql`now()` })
		.where(
			and(
				eq(table.prefixFormatTable.id, input.id),
				isNull(table.prefixFormatTable.deletedAt)
			)
		);
}

