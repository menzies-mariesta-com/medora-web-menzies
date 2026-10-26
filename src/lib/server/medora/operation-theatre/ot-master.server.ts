import { error } from '@sveltejs/kit';
import { and, asc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { OtMasterRow } from '$lib/model/type/medora/operation-theatre.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listOtMasters(input: {
	hospitalId: string;
	branchId?: string | null;
	includeInactive?: boolean;
}): Promise<OtMasterRow[]> {
	const conditions = [
		eq(table.otRoomTable.hospitalId, input.hospitalId)
	];
	if (!input.includeInactive) {
		conditions.push(
			eq(table.otRoomTable.statusId, StatusEnum.ACTIVE)
		);
	} else {
		conditions.push(
			ne(table.otRoomTable.statusId, StatusEnum.DELETED)
		);
	}
	if (input.branchId) {
		conditions.push(eq(table.otRoomTable.branchId, input.branchId));
	}
	const rows = await ensureDb()
		.select({
			room: table.otRoomTable,
			branchName: table.hospitalBranchTable.name
		})
		.from(table.otRoomTable)
		.leftJoin(
			table.hospitalBranchTable,
			eq(table.otRoomTable.branchId, table.hospitalBranchTable.id)
		)
		.where(and(...conditions))
		.orderBy(
			asc(table.otRoomTable.sequenceNo),
			asc(table.otRoomTable.name)
		);
	return rows.map((r) => ({
		...r.room,
		branchName: r.branchName ?? null
	}));
}

export async function saveOtMaster(input: {
	id?: number;
	hospitalId: string;
	branchId: string;
	name: string;
	sequenceNo?: number;
	freezeMinutes?: number;
	otAdvanceMandatory?: boolean;
	active?: boolean;
}) {
	const name = input.name.trim();
	if (!name) throw error(400, 'Theatre name is required.');
	if (!input.branchId) throw error(400, 'Facility is required.');
	if (
		input.freezeMinutes != null &&
		(!Number.isFinite(input.freezeMinutes) ||
			input.freezeMinutes < 0 ||
			input.freezeMinutes > 240)
	) {
		throw error(
			400,
			'Freeze time must be between 0 and 240 minutes.'
		);
	}
	const db = ensureDb();

	const duplicate = await db
		.select({ id: table.otRoomTable.id })
		.from(table.otRoomTable)
		.where(
			and(
				eq(table.otRoomTable.hospitalId, input.hospitalId),
				eq(table.otRoomTable.branchId, input.branchId),
				eq(table.otRoomTable.name, name),
				ne(table.otRoomTable.statusId, StatusEnum.DELETED),
				input.id ? ne(table.otRoomTable.id, input.id) : undefined
			)
		)
		.limit(1);
	if (duplicate.length > 0) {
		throw error(
			409,
			'A theatre with this name already exists at the selected facility.'
		);
	}

	if (input.id) {
		const [row] = await db
			.update(table.otRoomTable)
			.set({
				name,
				branchId: input.branchId,
				sequenceNo: input.sequenceNo ?? 0,
				freezeMinutes: input.freezeMinutes ?? 0,
				otAdvanceMandatory: input.otAdvanceMandatory ?? false,
				statusId:
					input.active === false
						? StatusEnum.INACTIVE
						: StatusEnum.ACTIVE,
				updatedAt: new Date().toISOString()
			})
			.where(
				and(
					eq(table.otRoomTable.id, input.id),
					eq(table.otRoomTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'Theatre not found.');
		return row;
	}

	const [row] = await db
		.insert(table.otRoomTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			name,
			sequenceNo: input.sequenceNo ?? 0,
			freezeMinutes: input.freezeMinutes ?? 0,
			otAdvanceMandatory: input.otAdvanceMandatory ?? false,
			statusId:
				input.active === false
					? StatusEnum.INACTIVE
					: StatusEnum.ACTIVE
		})
		.returning();
	return row!;
}
