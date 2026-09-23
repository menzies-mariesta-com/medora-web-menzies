import { error, type RequestEvent } from '@sveltejs/kit';
import { StaffTypeEnum } from '$lib/model/enum/db-link';
import { and, eq, inArray } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export function isConsultant(
	staffTypeId: number | null | undefined
): boolean {
	return (
		staffTypeId === StaffTypeEnum.DOCTOR ||
		staffTypeId === StaffTypeEnum.CONSULTANT
	);
}

export function isMo(
	staffTypeId: number | null | undefined
): boolean {
	return staffTypeId === StaffTypeEnum.MEDICAL_OFFICER;
}

export function requireClinicalStaff(event: RequestEvent): {
	id: string;
	staffTypeId: number;
} {
	const staff = event.locals.staff;
	if (!staff?.id || staff.staffTypeId == null) {
		throw error(401, 'Clinical staff session is required');
	}
	if (!isConsultant(staff.staffTypeId) && !isMo(staff.staffTypeId)) {
		throw error(403, 'MO or consultant access is required');
	}
	return { id: String(staff.id), staffTypeId: staff.staffTypeId };
}

export function requireConsultant(event: RequestEvent): string {
	const staff = requireClinicalStaff(event);
	if (!isConsultant(staff.staffTypeId)) {
		throw error(403, 'Consultant approval is required');
	}
	return staff.id;
}

export async function assertHighRiskMedicationAuthorized(input: {
	batchId: number;
	itemIds: number[];
}): Promise<void> {
	if (input.itemIds.length === 0) return;
	const [highRisk] = await ensureDb()
		.select({ id: table.itemMasterTable.id })
		.from(table.itemMasterTable)
		.where(
			and(
				inArray(table.itemMasterTable.id, input.itemIds),
				eq(table.itemMasterTable.isHighRisk, true)
			)
		)
		.limit(1);
	if (!highRisk) return;
	const [order] = await ensureDb()
		.select({
			staffTypeId: table.staffTable.staffTypeId,
			cosignedAt: table.medicationOrderBatchTable.consultantCosignedAt
		})
		.from(table.medicationOrderBatchTable)
		.leftJoin(
			table.staffTable,
			eq(
				table.medicationOrderBatchTable.orderingStaffId,
				table.staffTable.id
			)
		)
		.where(eq(table.medicationOrderBatchTable.id, input.batchId))
		.limit(1);
	if (
		order?.staffTypeId === StaffTypeEnum.MEDICAL_OFFICER &&
		!order.cosignedAt
	) {
		throw error(
			409,
			'High-risk medication ordered by an MO requires consultant cosign before dispense'
		);
	}
}
