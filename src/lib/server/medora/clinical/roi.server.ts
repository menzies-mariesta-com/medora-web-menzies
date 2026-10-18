import { and, eq } from 'drizzle-orm';
import { RoiRequestStatusEnum } from '$lib/model/enum/clinical-platform.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listRoiRequests(hospitalId: string) {
	return ensureDb()
		.select()
		.from(table.roiRequestTable)
		.where(eq(table.roiRequestTable.hospitalId, hospitalId))
		.orderBy(table.roiRequestTable.createdAt);
}

export async function createRoiRequest(input: {
	hospitalId: string;
	patientId: string;
	requesterName: string;
	requesterContact?: string | null;
	scopeDescription: string;
	dueDate?: string | null;
	assignedStaffId?: string | null;
	staffId?: string | null;
}) {
	const [row] = await ensureDb()
		.insert(table.roiRequestTable)
		.values({
			hospitalId: input.hospitalId,
			patientId: input.patientId,
			requesterName: input.requesterName,
			requesterContact: input.requesterContact ?? null,
			scopeDescription: input.scopeDescription,
			requestStatus: RoiRequestStatusEnum.INTAKE,
			dueDate: input.dueDate ?? null,
			assignedStaffId: input.assignedStaffId ?? null
		})
		.returning();
	if (row) {
		await ensureDb().insert(table.roiRequestEventTable).values({
			roiRequestId: row.id,
			eventType: 'created',
			staffId: input.staffId ?? null
		});
	}
	return row;
}

export async function updateRoiStatus(input: {
	hospitalId: string;
	id: number;
	requestStatus: string;
	remark?: string;
	staffId?: string | null;
}) {
	await ensureDb()
		.update(table.roiRequestTable)
		.set({ requestStatus: input.requestStatus })
		.where(
			and(
				eq(table.roiRequestTable.id, input.id),
				eq(table.roiRequestTable.hospitalId, input.hospitalId)
			)
		);
	await ensureDb().insert(table.roiRequestEventTable).values({
		roiRequestId: input.id,
		eventType: `status_${input.requestStatus}`,
		remark: input.remark ?? null,
		staffId: input.staffId ?? null
	});
}
