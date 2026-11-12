import { error } from '@sveltejs/kit';
import { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';
import { getVisitOpenMode } from '$lib/server/medora/billing/hospital-billing-setting.server';
import { patientHasOpenBill } from '$lib/server/medora/billing/patient-open-bill.server';
import { ensureDb } from '$lib/server/db';

/**
 * Block opening a new visit when hospital billing setting is ONE_VISIT_ONE_BILL
 * and the patient has any open OP or IP bill at this hospital.
 */
export async function assertPatientCanOpenNewVisit(
	input: {
		hospitalId: string;
		patientId: string;
	},
	db: ReturnType<typeof ensureDb> = ensureDb()
): Promise<void> {
	const mode = await getVisitOpenMode(input.hospitalId, db);
	if (mode === BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL) {
		return;
	}

	const { hasOpen, sample } = await patientHasOpenBill({
		hospitalId: input.hospitalId,
		patientId: input.patientId,
		db
	});

	if (!hasOpen || !sample) return;

	const label = sample.visitNo ?? `#${sample.visitId}`;
	const billRef = sample.billNo?.trim()
		? ` (${sample.billKind.toUpperCase()} bill ${sample.billNo})`
		: '';
	throw error(
		400,
		`Cannot open a new visit: close the open bill on visit ${label}${billRef} first (One visit one bill).`
	);
}
