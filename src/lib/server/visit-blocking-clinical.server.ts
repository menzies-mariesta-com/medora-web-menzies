import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, count, eq, isNull, ne } from 'drizzle-orm';

/**
 * True when the visit has EMR / billing / referral data so the linked appointment
 * must not be cancelled (vitals in `patient_diagnosis`, allergies, documents, etc.).
 *
 * Kept outside `*.remote.ts` (not a SvelteKit remote export).
 */
export async function visitHasBlockingClinicalData(
	visitId: number
): Promise<boolean> {
	const db = ensureDb();
	const t = table;
	const [v] = await db
		.select()
		.from(t.patientVisitTable)
		.where(eq(t.patientVisitTable.id, visitId))
		.limit(1);
	if (!v) return false;
	if (String(v.chiefComplaint ?? '').trim()) return true;
	if (String(v.patientCondition ?? '').trim()) return true;
	if (String(v.diagnosisNotes ?? '').trim()) return true;

	/** Per-table status columns are distinct Drizzle types but comparable to DELETED. */
	const notDel = (statusCol: unknown) => ne(statusCol as any, StatusEnum.DELETED);

	const [
		nPd,
		nDx,
		nAl,
		nDoc,
		nForm,
		nOrd,
		nBill,
		nRef
	] = await Promise.all([
		db
			.select({ n: count() })
			.from(t.patientDiagnosisTable)
			.where(
				and(
					eq(t.patientDiagnosisTable.visitId, visitId),
					notDel(t.patientDiagnosisTable.statusId)
				)
			),
		db
			.select({ n: count() })
			.from(t.diagnosisTable)
			.where(
				and(
					eq(t.diagnosisTable.visitId, visitId),
					notDel(t.diagnosisTable.statusId)
				)
			),
		db
			.select({ n: count() })
			.from(t.patientAllergyTable)
			.where(
				and(
					eq(t.patientAllergyTable.visitId, visitId),
					ne(t.patientAllergyTable.statusId, StatusEnum.DELETED)
				)
			),
		db
			.select({ n: count() })
			.from(t.patientDocumentTable)
			.where(
				and(
					eq(t.patientDocumentTable.visitId, visitId),
					notDel(t.patientDocumentTable.statusId)
				)
			),
		db
			.select({ n: count() })
			.from(t.patientFormEntryTable)
			.where(
				and(
					eq(t.patientFormEntryTable.visitId, visitId),
					notDel(t.patientFormEntryTable.statusId)
				)
			),
		db
			.select({ n: count() })
			.from(t.serviceOrderTable)
			.where(
				and(
					eq(t.serviceOrderTable.visitId, visitId),
					notDel(t.serviceOrderTable.statusId)
				)
			),
		db
			.select({ n: count() })
			.from(t.opBillingTable)
			.where(
				and(
					eq(t.opBillingTable.visitId, visitId),
					notDel(t.opBillingTable.statusId)
				)
			),
		db
			.select({ n: count() })
			.from(t.referHistoryTable)
			.where(
				and(
					eq(t.referHistoryTable.visitId, visitId),
					isNull(t.referHistoryTable.cancelAt)
				)
			)
	]);

	const nums = [
		nPd[0]?.n,
		nDx[0]?.n,
		nAl[0]?.n,
		nDoc[0]?.n,
		nForm[0]?.n,
		nOrd[0]?.n,
		nBill[0]?.n,
		nRef[0]?.n
	];
	return nums.some((n) => Number(n ?? 0) > 0);
}
