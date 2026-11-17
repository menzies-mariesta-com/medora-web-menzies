import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import {
	SYSTEM_DATA_PLACEHOLDER_CODES,
	listSystemPlaceholders
} from '$lib/model/constant/document-placeholder.registry';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';

const CODE_RE = /^[a-z][a-z0-9_]*$/;

export async function listTextPlaceholders(
	event: RequestEvent,
	hospitalId: string
) {
	await ensureCanAccessHospital(event, hospitalId);
	return ensureDb().query.hospitalDocumentTextPlaceholderTable.findMany({
		where: and(
			eq(table.hospitalDocumentTextPlaceholderTable.hospitalId, hospitalId),
			ne(table.hospitalDocumentTextPlaceholderTable.statusId, StatusEnum.DELETED)
		),
		orderBy: (t, { asc }) => [asc(t.code)]
	});
}

export async function listTextPlaceholdersAsMap(
	hospitalId: string
): Promise<Record<string, string>> {
	const rows = await ensureDb()
		.select()
		.from(table.hospitalDocumentTextPlaceholderTable)
		.where(
			and(
				eq(table.hospitalDocumentTextPlaceholderTable.hospitalId, hospitalId),
				ne(table.hospitalDocumentTextPlaceholderTable.statusId, StatusEnum.DELETED)
			)
		);
	const out: Record<string, string> = {};
	for (const row of rows) out[row.code] = row.text;
	return out;
}

export function listSystemPlaceholderMetadata() {
	return listSystemPlaceholders();
}

export async function createTextPlaceholder(
	event: RequestEvent,
	input: {
		hospitalId: string;
		code: string;
		text: string;
		description?: string | null;
	}
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	const code = input.code.trim();
	if (!CODE_RE.test(code)) {
		throw error(400, 'Invalid placeholder code');
	}
	if (SYSTEM_DATA_PLACEHOLDER_CODES.has(code)) {
		throw error(400, 'Code reserved for system data placeholders');
	}
	const [row] = await ensureDb()
		.insert(table.hospitalDocumentTextPlaceholderTable)
		.values({
			hospitalId: input.hospitalId,
			code,
			text: input.text,
			description: input.description ?? null
		})
		.returning();
	return row;
}

export async function updateTextPlaceholder(
	event: RequestEvent,
	input: {
		hospitalId: string;
		id: number;
		text?: string;
		description?: string | null;
	}
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [row] = await ensureDb()
		.update(table.hospitalDocumentTextPlaceholderTable)
		.set({
			...(input.text !== undefined ? { text: input.text } : {}),
			...(input.description !== undefined
				? { description: input.description }
				: {}),
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.hospitalDocumentTextPlaceholderTable.id, input.id),
				eq(table.hospitalDocumentTextPlaceholderTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Placeholder not found');
	return row;
}

export async function deleteTextPlaceholder(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureDb()
		.update(table.hospitalDocumentTextPlaceholderTable)
		.set({
			statusId: StatusEnum.DELETED,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.hospitalDocumentTextPlaceholderTable.id, input.id),
				eq(table.hospitalDocumentTextPlaceholderTable.hospitalId, input.hospitalId)
			)
		);
}
