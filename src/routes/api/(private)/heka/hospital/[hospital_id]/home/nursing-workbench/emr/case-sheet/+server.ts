import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';
import type { PatientDiagnosisSchema, ServiceOrderDetailSchema } from '$lib/server/db/schema-type';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

type OrderDetailVisitRow = ServiceOrderDetailSchema & {
	orderNo: string | null;
	serviceName: string | null;
};

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const visitId = Number(event.url.searchParams.get('visitId') ?? '0');
	if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');

	const visitRow = await obs.getPatientVisitById({ id: visitId, hospitalId });
	if (!visitRow) {
		return json({
			visitRow: null,
			allergies: [],
			vitals: [],
			orderLines: [],
			visitDiagnoses: [],
			chiefComplaintEntries: [],
			patientConditionEntries: []
		});
	}

	const [allergyAll, vitals, orderLines, visitDiagnoses, chiefComplaintEntries, patientConditionEntries] =
		await Promise.all([
			obs.getPatientAllergiesByPatientIdWithRelations({ patientId: (visitRow as any).patientId }),
			obs.getPatientVitalsByVisitId({ visitId }),
			obs.getServiceOrderDetailRowsForVisit({ visitId }),
			obs.getDiagnosesByVisitId({ visitId }),
			obs.getPatientFormEntriesByVisitIdAndFormCode({ visitId, formCode: 'chief_complaint' }).catch(() => []),
			obs.getPatientFormEntriesByVisitIdAndFormCode({ visitId, formCode: 'patient_condition' }).catch(() => [])
		]);

	const hospitalIdParam = (visitRow as any).hospitalId ?? hospitalId;
	const allergies = hospitalIdParam
		? (allergyAll as any[]).filter((row) => row.visit?.hospitalId === hospitalIdParam)
		: (allergyAll as any[]);

	return json({
		visitRow,
		allergies,
		vitals: vitals as PatientDiagnosisSchema[],
		orderLines: orderLines as OrderDetailVisitRow[],
		visitDiagnoses,
		chiefComplaintEntries,
		patientConditionEntries
	});
}

