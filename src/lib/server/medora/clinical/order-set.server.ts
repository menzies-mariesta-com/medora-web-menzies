import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listOrderSets(hospitalId: string) {
	return ensureDb()
		.select()
		.from(table.clinicalOrderSetTable)
		.where(
			and(
				eq(table.clinicalOrderSetTable.hospitalId, hospitalId),
				eq(table.clinicalOrderSetTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(asc(table.clinicalOrderSetTable.name));
}

export async function getOrderSetWithLines(input: {
	hospitalId: string;
	orderSetId: number;
}) {
	const [header] = await ensureDb()
		.select()
		.from(table.clinicalOrderSetTable)
		.where(
			and(
				eq(table.clinicalOrderSetTable.id, input.orderSetId),
				eq(table.clinicalOrderSetTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!header) throw error(404, 'Order set not found');
	const lines = await ensureDb()
		.select()
		.from(table.clinicalOrderSetLineTable)
		.where(
			and(
				eq(table.clinicalOrderSetLineTable.orderSetId, input.orderSetId),
				eq(table.clinicalOrderSetLineTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(asc(table.clinicalOrderSetLineTable.lineNo));
	return { header, lines };
}

export async function saveOrderSet(input: {
	hospitalId: string;
	id?: number;
	name: string;
	specialtyTag?: string | null;
	lines: {
		lineNo: number;
		lineType: string;
		payloadJson: Record<string, unknown>;
	}[];
}) {
	const db = ensureDb();
	if (input.id) {
		await db
			.update(table.clinicalOrderSetTable)
			.set({
				name: input.name,
				specialtyTag: input.specialtyTag ?? null
			})
			.where(
				and(
					eq(table.clinicalOrderSetTable.id, input.id),
					eq(table.clinicalOrderSetTable.hospitalId, input.hospitalId)
				)
			);
		await db
			.delete(table.clinicalOrderSetLineTable)
			.where(eq(table.clinicalOrderSetLineTable.orderSetId, input.id));
		await db.insert(table.clinicalOrderSetLineTable).values(
			input.lines.map((l) => ({
				orderSetId: input.id!,
				lineNo: l.lineNo,
				lineType: l.lineType,
				payloadJson: l.payloadJson
			}))
		);
		return input.id;
	}
	const [row] = await db
		.insert(table.clinicalOrderSetTable)
		.values({
			hospitalId: input.hospitalId,
			name: input.name,
			specialtyTag: input.specialtyTag ?? null
		})
		.returning({ id: table.clinicalOrderSetTable.id });
	if (!row) throw error(500, 'Unable to create order set');
	await db.insert(table.clinicalOrderSetLineTable).values(
		input.lines.map((l) => ({
			orderSetId: row.id,
			lineNo: l.lineNo,
			lineType: l.lineType,
			payloadJson: l.payloadJson
		}))
	);
	return row.id;
}

export async function deleteOrderSet(input: {
	hospitalId: string;
	id: number;
}) {
	await ensureDb()
		.update(table.clinicalOrderSetTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.clinicalOrderSetTable.id, input.id),
				eq(table.clinicalOrderSetTable.hospitalId, input.hospitalId)
			)
		);
}
