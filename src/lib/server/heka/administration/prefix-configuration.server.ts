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

function collectErrorText(e: unknown): string {
	if (e == null) return '';
	if (typeof e === 'string') return e;
	if (e instanceof Error) {
		const parts = [e.message];
		let c: unknown = (e as { cause?: unknown }).cause;
		let depth = 0;
		while (c != null && depth++ < 5) {
			if (c instanceof Error) {
				parts.push(c.message);
				c = (c as { cause?: unknown }).cause;
			} else {
				parts.push(String(c));
				break;
			}
		}
		return parts.join(' | ');
	}
	return String(e);
}

/** Maps Neon/Drizzle failures to actionable HTTP errors (schema drift, duplicates, FK). */
export function rethrowPrefixFormatDbError(e: unknown): never {
	const raw = collectErrorText(e);
	const lower = raw.toLowerCase();

	if (
		lower.includes('prefix_format') &&
		(lower.includes('does not exist') ||
			lower.includes('relation') ||
			lower.includes('42p01'))
	) {
		throw error(
			503,
			'Database is missing the prefix_format table or it is out of date. Apply migrations (e.g. pnpm run db:migrate) including drizzle/0014_prefix_format_and_counter.sql and later.'
		);
	}

	if (
		lower.includes('prefix_format') &&
		(lower.includes('column') || lower.includes('42703')) &&
		lower.includes('does not exist')
	) {
		throw error(
			503,
			'prefix_format columns are missing (migrations not applied). Run pending migrations (e.g. 0015–0023 for counter scope flags).'
		);
	}

	if (
		lower.includes('23505') ||
		lower.includes('unique constraint') ||
		lower.includes('duplicate key') ||
		lower.includes('prefix_format_hospital_key_unique')
	) {
		throw error(
			409,
			'A prefix configuration for this key already exists for this hospital. Refresh the page or edit the existing row.'
		);
	}

	if (lower.includes('23503') || lower.includes('foreign key')) {
		throw error(
			400,
			'Could not save prefix configuration: invalid hospital or user reference.'
		);
	}

	const short =
		raw.length > 420 ? `${raw.slice(0, 420)}…` : raw || 'Database error';
	throw error(500, short);
}

export async function getPrefixConfigurationByHospital(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<PrefixFormatSchema[]> {
	try {
		await ensureCanAccessHospital(event, input.hospitalId);
		return await ensureDb()
			.select()
			.from(table.prefixFormatTable)
			.where(
				and(
					eq(table.prefixFormatTable.hospitalId, input.hospitalId),
					isNull(table.prefixFormatTable.deletedAt)
				)
			);
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		rethrowPrefixFormatDbError(e);
	}
}

export async function createPrefixConfiguration(
	event: RequestEvent,
	input: PrefixFormatSchemaInsert
): Promise<PrefixFormatSchema> {
	try {
		await ensureCanAccessHospital(event, input.hospitalId);
		const [inserted] = await ensureDb()
			.insert(table.prefixFormatTable)
			.values(input)
			.returning();
		if (!inserted) throw new Error('Failed to create prefix configuration');
		return inserted;
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		rethrowPrefixFormatDbError(e);
	}
}

export async function updatePrefixConfiguration(
	event: RequestEvent,
	input: PrefixFormatSchemaUpdate & { id: number }
): Promise<PrefixFormatSchema> {
	try {
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
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		rethrowPrefixFormatDbError(e);
	}
}

export async function deletePrefixConfiguration(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	try {
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
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		rethrowPrefixFormatDbError(e);
	}
}

