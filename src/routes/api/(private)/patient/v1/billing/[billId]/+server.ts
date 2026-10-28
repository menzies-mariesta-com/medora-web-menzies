import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import {
	getPatientBillDetail,
	type PatientBillType
} from '$lib/server/medora/patient-portal/billing.server';
import {
	handlePatientOptions,
	patientJson
} from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = await requirePatientReadContext(event);
	const billId = Number(event.params.billId);
	if (!Number.isInteger(billId)) throw error(400, 'Invalid bill id');
	const type = (event.url.searchParams.get('type') ??
		'op') as PatientBillType;
	if (type !== 'op' && type !== 'ip')
		throw error(400, 'Invalid bill type');
	const bill = await getPatientBillDetail(ctx, type, billId);
	if (!bill) throw error(404, 'Bill not found');
	return patientJson(event, bill);
}
