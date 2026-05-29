import { error, json, type RequestEvent } from '@sveltejs/kit';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
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

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
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

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const visitId = Number(
		event.url.searchParams.get('visitId') ?? '0'
	);
	if (!Number.isFinite(visitId) || visitId <= 0)
		throw error(400, 'visitId is required');

	const visitRow = await obs.getPatientVisitById({
		id: visitId,
		hospitalId
	});
	if (!visitRow) {
		return json({
			visitRow: null,
			allergies: [],
			vitals: [],
			orderLines: [],
			visitDiagnoses: [],
			chiefComplaintEntries: [],
			patientConditionEntries: [],
			userDisplayById: {}
		});
	}

	const [
		allergyAll,
		vitals,
		orderLines,
		visitDiagnoses,
		chiefComplaintEntries,
		patientConditionEntries
	] = await Promise.all([
		obs.getPatientAllergiesByPatientIdWithRelations({
			patientId: (visitRow as any).patientId
		}),
		obs.getPatientVitalsByVisitId({ visitId }),
		obs.getServiceOrderDetailRowsForVisit({ visitId }),
		obs.getDiagnosesByVisitId({ visitId }),
		obs
			.getPatientFormEntriesByVisitIdAndFormCode({
				visitId,
				formCode: 'chief_complaint'
			})
			.catch(() => []),
		obs
			.getPatientFormEntriesByVisitIdAndFormCode({
				visitId,
				formCode: 'patient_condition'
			})
			.catch(() => [])
	]);

	const hospitalIdParam = (visitRow as any).hospitalId ?? hospitalId;
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

	return json({
		visitRow,
		allergies,
		vitals: activeVitals as PatientDiagnosisSchema[],
		orderLines: activeOrderLines as OrderDetailVisitRow[],
		visitDiagnoses: activeVisitDiagnoses,
		chiefComplaintEntries: activeChiefComplaintEntries,
		patientConditionEntries: activePatientConditionEntries,
		userDisplayById
	});
}
