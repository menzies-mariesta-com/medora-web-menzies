import type { RequestEvent } from '@sveltejs/kit';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { NursingCaseSheetPayload } from '$lib/model/type/heka/case-sheet.type';
import * as obs from '$lib/server/heka/observation/observation-emr.server';
import { getUserDisplayNameByIds } from '$lib/server/heka/user-display.server';
import type {
	PatientDiagnosisSchema,
	ServiceOrderDetailSchema
} from '$lib/server/db/schema-type';

function collectAuditUserIds(rows: unknown[]): string[] {
	const ids: string[] = [];
	for (const row of rows) {
		if (row == null || typeof row !== 'object') continue;
		const r = row as { createdBy?: string | null; updatedBy?: string | null };
		if (r.createdBy?.trim()) ids.push(r.createdBy.trim());
		if (r.updatedBy?.trim()) ids.push(r.updatedBy.trim());
	}
	return ids;
}

type OrderDetailVisitRow = ServiceOrderDetailSchema & {
	orderNo: string | null;
	serviceName: string | null;
};

function activeOnly<T extends { statusId?: number | null }>(
	rows: T[]
): T[] {
	return rows.filter((row) => row.statusId === StatusEnum.ACTIVE);
}

const emptyPayload = (): NursingCaseSheetPayload => ({
	visitRow: null,
	allergies: [],
	vitals: [],
	orderLines: [],
	visitDiagnoses: [],
	chiefComplaintEntries: [],
	patientConditionEntries: [],
	userDisplayById: {}
});

export async function getNursingCaseSheetPayload(
	_event: RequestEvent,
	input: { hospitalId: string; visitId: number }
): Promise<NursingCaseSheetPayload> {
	const visitRow = await obs.getPatientVisitById({
		id: input.visitId,
		hospitalId: input.hospitalId
	});
	if (!visitRow) return emptyPayload();

	const patientId = (visitRow as { patientId?: string | null }).patientId;
	if (!patientId) return { ...emptyPayload(), visitRow };

	const [
		allergyAll,
		vitals,
		orderLines,
		visitDiagnoses,
		chiefComplaintEntries,
		patientConditionEntries
	] = await Promise.all([
		obs.getPatientAllergiesByPatientIdWithRelations({ patientId }),
		obs.getPatientVitalsByVisitId({ visitId: input.visitId }),
		obs.getServiceOrderDetailRowsForVisit({ visitId: input.visitId }),
		obs.getDiagnosesByVisitId({ visitId: input.visitId }),
		obs
			.getPatientFormEntriesByVisitIdAndFormCode({
				visitId: input.visitId,
				formCode: 'chief_complaint'
			})
			.catch(() => []),
		obs
			.getPatientFormEntriesByVisitIdAndFormCode({
				visitId: input.visitId,
				formCode: 'patient_condition'
			})
			.catch(() => [])
	]);

	const hospitalIdParam =
		(visitRow as { hospitalId?: string | null }).hospitalId ??
		input.hospitalId;
	const allergiesForHospital = hospitalIdParam
		? (allergyAll as any[]).filter(
				(row) => row.visit?.hospitalId === hospitalIdParam
			)
		: (allergyAll as any[]);
	const allergies = activeOnly(allergiesForHospital);
	const activeVitals = activeOnly(vitals as { statusId?: number | null }[]);
	const activeOrderLines = activeOnly(
		orderLines as { statusId?: number | null }[]
	);
	const activeVisitDiagnoses = activeOnly(
		visitDiagnoses as { statusId?: number | null }[]
	);
	const activeChiefComplaintEntries = activeOnly(
		chiefComplaintEntries as { statusId?: number | null }[]
	);
	const activePatientConditionEntries = activeOnly(
		patientConditionEntries as { statusId?: number | null }[]
	);

	const userIds = [
		...collectAuditUserIds(allergies),
		...collectAuditUserIds(activeVitals),
		...collectAuditUserIds(activeOrderLines),
		...collectAuditUserIds(activeVisitDiagnoses),
		...collectAuditUserIds(activeChiefComplaintEntries),
		...collectAuditUserIds(activePatientConditionEntries)
	];
	const userDisplayById = await getUserDisplayNameByIds(userIds);

	return {
		visitRow,
		allergies,
		vitals: activeVitals as PatientDiagnosisSchema[],
		orderLines: activeOrderLines as OrderDetailVisitRow[],
		visitDiagnoses: activeVisitDiagnoses,
		chiefComplaintEntries: activeChiefComplaintEntries,
		patientConditionEntries: activePatientConditionEntries,
		userDisplayById
	};
}
