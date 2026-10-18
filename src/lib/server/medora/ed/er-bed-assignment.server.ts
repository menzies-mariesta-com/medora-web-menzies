import { error } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';
import { IpdBedStatusEnum, StatusEnum } from '$lib/model/enum/db-link';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export function throwErBedRequired(): never {
	throw error(400, {
		code: ApiErrorCodeEnum.ER_BED_REQUIRED,
		message: 'Assign an ER bed before moving to this column.'
	});
}

async function getEncounterForVisit(input: {
	hospitalId: string;
	visitId: string;
}) {
	const [enc] = await ensureDb()
		.select()
		.from(table.edEncounterTable)
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId),
				eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!enc) throw error(404, 'ED encounter not found');
	return enc;
}

async function loadErBedLocation(input: {
	hospitalId: string;
	erBedId: number;
}) {
	const [row] = await ensureDb()
		.select({
			bed: table.erBedTable,
			erRoomId: table.erRoomTable.id,
			erWardId: table.erRoomTable.erWardId
		})
		.from(table.erBedTable)
		.innerJoin(
			table.erRoomTable,
			eq(table.erBedTable.erRoomId, table.erRoomTable.id)
		)
		.where(
			and(
				eq(table.erBedTable.id, input.erBedId),
				eq(table.erBedTable.hospitalId, input.hospitalId),
				eq(table.erBedTable.statusId, StatusEnum.ACTIVE),
				ne(table.erRoomTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) throw error(400, 'ER bed not found');
	if (row.bed.bedStatus !== IpdBedStatusEnum.FREE) {
		throw error(400, 'ER bed is not available');
	}
	return row;
}

export async function releaseErBedForEncounter(input: {
	hospitalId: string;
	visitId: string;
}): Promise<void> {
	const enc = await getEncounterForVisit(input);
	if (!enc.erBedId) return;

	await ensureDb().transaction(async (tx) => {
		await tx
			.update(table.erBedTable)
			.set({ bedStatus: IpdBedStatusEnum.FREE })
			.where(eq(table.erBedTable.id, enc.erBedId!));
		await tx
			.update(table.edEncounterTable)
			.set({
				erWardId: null,
				erRoomId: null,
				erBedId: null,
				erBedAssignedAt: null
			})
			.where(eq(table.edEncounterTable.id, enc.id));
	});
}

export async function assignErBedToEncounter(input: {
	hospitalId: string;
	visitId: string;
	erBedId: number;
}) {
	const enc = await getEncounterForVisit(input);
	const loc = await loadErBedLocation({
		hospitalId: input.hospitalId,
		erBedId: input.erBedId
	});

	return ensureDb().transaction(async (tx) => {
		if (enc.erBedId && enc.erBedId !== input.erBedId) {
			await tx
				.update(table.erBedTable)
				.set({ bedStatus: IpdBedStatusEnum.FREE })
				.where(eq(table.erBedTable.id, enc.erBedId));
		}

		await tx
			.update(table.erBedTable)
			.set({ bedStatus: IpdBedStatusEnum.OCCUPIED })
			.where(eq(table.erBedTable.id, input.erBedId));

		const assignedAt = new Date().toISOString();
		const [updated] = await tx
			.update(table.edEncounterTable)
			.set({
				erWardId: loc.erWardId,
				erRoomId: loc.erRoomId,
				erBedId: input.erBedId,
				erBedAssignedAt: assignedAt
			})
			.where(eq(table.edEncounterTable.id, enc.id))
			.returning();

		return updated!;
	});
}

export async function assignErBedToEncounterWithCharges(input: {
	hospitalId: string;
	visitId: string;
	erBedId: number;
	userId: string;
}) {
	const row = await assignErBedToEncounter(input);
	const { ensureErBedChargeServiceLine } = await import(
		'$lib/server/medora/ed/ed-er-bed-charge.server'
	);
	await ensureErBedChargeServiceLine({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		userId: input.userId
	});
	return row;
}

export async function transferErBedForEncounter(input: {
	hospitalId: string;
	visitId: string;
	erBedId: number;
}) {
	return assignErBedToEncounter(input);
}

export async function releaseErBedOnEdDischarge(input: {
	hospitalId: string;
	visitId: string;
	boardColumn: string;
}): Promise<void> {
	if (input.boardColumn !== EdBoardColumnEnum.DISCHARGED) return;
	const enc = await getEncounterForVisit(input);
	if (enc.retainErBedAfterDischarge) return;
	await releaseErBedForEncounter({
		hospitalId: input.hospitalId,
		visitId: input.visitId
	});
}
