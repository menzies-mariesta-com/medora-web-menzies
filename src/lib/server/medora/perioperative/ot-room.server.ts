import { error } from '@sveltejs/kit';
import { and, asc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listOtRooms(input: {
	hospitalId: string;
	branchId?: string | null;
}) {
	const conditions = [
		eq(table.otRoomTable.hospitalId, input.hospitalId),
		ne(table.otRoomTable.statusId, StatusEnum.DELETED)
	];
	if (input.branchId) {
		conditions.push(eq(table.otRoomTable.branchId, input.branchId));
	}
	return ensureDb()
		.select()
		.from(table.otRoomTable)
		.where(and(...conditions))
		.orderBy(asc(table.otRoomTable.sequenceNo), asc(table.otRoomTable.name));
}

export async function saveOtRoom(input: {
	id?: number;
	hospitalId: string;
	branchId: string;
	name: string;
	sequenceNo?: number;
}) {
	const name = input.name.trim();
	if (!name) throw error(400, 'Room name is required');
	if (input.id) {
		const [row] = await ensureDb()
			.update(table.otRoomTable)
			.set({
				name,
				branchId: input.branchId,
				sequenceNo: input.sequenceNo ?? 0
			})
			.where(
				and(
					eq(table.otRoomTable.id, input.id),
					eq(table.otRoomTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'OT room not found');
		return row;
	}
	const [row] = await ensureDb()
		.insert(table.otRoomTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			name,
			sequenceNo: input.sequenceNo ?? 0
		})
		.returning();
	return row!;
}

export async function deleteOtRoom(input: {
	hospitalId: string;
	id: number;
}) {
	await ensureDb()
		.update(table.otRoomTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.otRoomTable.id, input.id),
				eq(table.otRoomTable.hospitalId, input.hospitalId)
			)
		);
}
