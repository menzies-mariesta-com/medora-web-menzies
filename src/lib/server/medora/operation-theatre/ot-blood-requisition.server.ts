import { error } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { OtBloodRequisitionRow } from '$lib/model/type/medora/operation-theatre.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	otRequestedBy,
	staffDisplayNameSql
} from './ot-shared.server';

export async function listOtBloodRequisitions(input: {
	hospitalId: string;
	caseId: number;
}): Promise<OtBloodRequisitionRow[]> {
	const rows = await ensureDb()
		.select({
			row: table.otBloodRequisitionTable,
			requestedByName: staffDisplayNameSql(otRequestedBy)
		})
		.from(table.otBloodRequisitionTable)
		.leftJoin(
			otRequestedBy,
			eq(table.otBloodRequisitionTable.requestedBy, otRequestedBy.id)
		)
		.where(
			and(
				eq(
					table.otBloodRequisitionTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.otBloodRequisitionTable.surgicalCaseId,
					input.caseId
				),
				ne(table.otBloodRequisitionTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.otBloodRequisitionTable.requestedAt));
	return rows.map((r) => ({
		id: r.row.id,
		surgicalCaseId: r.row.surgicalCaseId,
		bloodGroup: r.row.bloodGroup,
		component: r.row.component,
		units: r.row.units,
		urgency: r.row.urgency,
		notes: r.row.notes,
		requestedAt: r.row.requestedAt,
		requestedByName: r.requestedByName
	}));
}

export async function createOtBloodRequisition(input: {
	hospitalId: string;
	caseId: number;
	bloodGroup?: string | null;
	component: string;
	units: number;
	urgency?: string;
	notes?: string | null;
	staffId?: string | null;
}) {
	const [otCase] = await ensureDb()
		.select({
			id: table.surgicalCaseTable.id,
			branchId: table.surgicalCaseTable.branchId
		})
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!otCase) throw error(404, 'OT booking not found.');
	if (!input.component?.trim())
		throw error(400, 'Component is required.');
	if (!Number.isFinite(input.units) || input.units < 1) {
		throw error(400, 'Units must be at least 1.');
	}
	const [row] = await ensureDb()
		.insert(table.otBloodRequisitionTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: otCase.branchId,
			surgicalCaseId: input.caseId,
			bloodGroup: input.bloodGroup?.trim() || null,
			component: input.component.trim(),
			units: Math.floor(input.units),
			urgency: input.urgency?.trim() || 'routine',
			notes: input.notes?.trim() || null,
			requestedBy: input.staffId ?? null
		})
		.returning();
	return row!;
}
