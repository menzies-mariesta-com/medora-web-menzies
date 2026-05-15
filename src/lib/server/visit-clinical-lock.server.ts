import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const LOCKED_MESSAGE =
	'This visit has been saved as signed and cannot be edited.';

export async function assertVisitNotClinicallySigned(
	visitId: number | null | undefined
): Promise<void> {
	if (visitId == null || !Number.isFinite(visitId)) return;
	const [row] = await ensureDb()
		.select({
			clinicalSignedAt: table.patientVisitTable.clinicalSignedAt
		})
		.from(table.patientVisitTable)
		.where(eq(table.patientVisitTable.id, visitId))
		.limit(1);
	if (
		row?.clinicalSignedAt != null &&
		String(row.clinicalSignedAt).trim() !== ''
	) {
		throw new Error(LOCKED_MESSAGE);
	}
}

export async function assertVisitNotClinicallySignedByServiceOrderId(
	serviceOrderId: number | null | undefined
): Promise<void> {
	if (serviceOrderId == null || !Number.isFinite(serviceOrderId))
		return;
	const [ord] = await ensureDb()
		.select({ visitId: table.serviceOrderTable.visitId })
		.from(table.serviceOrderTable)
		.where(eq(table.serviceOrderTable.id, serviceOrderId))
		.limit(1);
	if (ord?.visitId != null) {
		await assertVisitNotClinicallySigned(ord.visitId);
	}
}
