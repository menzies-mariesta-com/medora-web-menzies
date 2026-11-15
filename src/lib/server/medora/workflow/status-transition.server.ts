import { error } from '@sveltejs/kit';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { ensureDb } from '$lib/server/db';
import type { AnyPgColumn, AnyPgTable } from 'drizzle-orm/pg-core';

export const DOCUMENT_STATUS_CONFLICT =
	'Document status changed; refresh the page and try again.';

export type DbTx = Parameters<
	Parameters<ReturnType<typeof ensureDb>['transaction']>[0]
>[0];

export function throwDocumentStatusConflict(): never {
	throw error(409, DOCUMENT_STATUS_CONFLICT);
}

/** After `.returning()` / conditional update — zero rows means lost race on status. */
export function assertRowsUpdated(
	rows: unknown[],
	message = DOCUMENT_STATUS_CONFLICT
): void {
	if (!rows.length) throw error(409, message);
}

type StatusLockColumns = {
	id: AnyPgColumn;
	statusTaggingId: AnyPgColumn;
};

/**
 * UPDATE … WHERE id AND status_tagging_id = expected; fails closed with 409 on conflict.
 */
export async function updateStatusTaggingIfCurrent<
	TTable extends AnyPgTable & StatusLockColumns
>(
	tx: DbTx,
	table: TTable,
	documentId: string | number,
	expectedStatusTaggingId: number,
	set: Record<string, unknown>,
	extraWhere: SQL[] = []
): Promise<void> {
	const rows = await tx
		.update(table)
		.set(set)
		.where(
			and(
				eq(table.id, documentId),
				eq(table.statusTaggingId, expectedStatusTaggingId),
				...extraWhere
			)
		)
		.returning({ id: table.id });
	assertRowsUpdated(rows);
}

/** Transition when current status is one of `fromStatusTaggingIds`. */
export async function transitionStatusFromAny<
	TTable extends AnyPgTable & StatusLockColumns
>(
	tx: DbTx,
	table: TTable,
	documentId: string | number,
	fromStatusTaggingIds: number[],
	set: Record<string, unknown>,
	extraWhere: SQL[] = []
): Promise<void> {
	const rows = await tx
		.update(table)
		.set(set)
		.where(
			and(
				eq(table.id, documentId),
				inArray(table.statusTaggingId, fromStatusTaggingIds),
				...extraWhere
			)
		)
		.returning({ id: table.id });
	assertRowsUpdated(rows);
}