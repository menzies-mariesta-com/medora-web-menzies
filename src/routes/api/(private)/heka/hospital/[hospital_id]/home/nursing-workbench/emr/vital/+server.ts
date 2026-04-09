import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import {
	createPatientVital,
	deletePatientVital,
	getPatientVitalById,
	getPatientVitalsByPatientIdPaginated,
	getVisitBasicsForVital,
	updatePatientVital
} from '$lib/server/heka/emr/patient-vital.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const action = event.url.searchParams.get('action') ?? 'list';

	if (action === 'visitBasics') {
		const visitId = Number(event.url.searchParams.get('visitId') ?? 0);
		const data = await getVisitBasicsForVital(event, { hospitalId, visitId });
		return json({ data });
	}

	if (action === 'byId') {
		const id = Number(event.url.searchParams.get('id') ?? 0);
		const data = await getPatientVitalById(event, { hospitalId, id });
		return json({ data });
	}

	// list (paginated by patient)
	const patientId = event.url.searchParams.get('patientId') ?? '';
	const visitNo = event.url.searchParams.get('visitNo');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : null;
	const page = Number(event.url.searchParams.get('page') ?? 1);
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? 10);

	const data = await getPatientVitalsByPatientIdPaginated(event, {
		hospitalId,
		patientId,
		visitNo: visitNo?.trim() ? visitNo : null,
		statusId:
			statusId != null && Number.isFinite(statusId) ? statusId : undefined,
		page,
		pageSize
	});
	return json(data);
}

const createSchema = z.object({
	patientId: z.string().min(1),
	visitId: z.number().int().positive(),
	height: z.string().optional(),
	heightUnitId: z.number().optional(),
	weight: z.string().optional(),
	weightUnitId: z.number().optional(),
	bpSystolic: z.string().optional(),
	bpDiastolic: z.string().optional(),
	bpUnitId: z.number().optional(),
	pulse: z.string().optional(),
	pulseUnitId: z.number().optional(),
	temperature: z.string().optional(),
	temperatureUnitId: z.number().optional(),
	spO2: z.string().optional(),
	spO2UnitId: z.number().optional(),
	respiration: z.string().optional(),
	respirationUnitId: z.number().optional(),
	rbs: z.string().optional(),
	rbsUnitId: z.number().optional(),
	bmi: z.string().optional(),
	symptom: z.string().optional(),
	description: z.string().optional(),
	remark: z.string().optional(),
	vitalDateTime: z.string().optional()
});

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const body = createSchema.parse(await event.request.json());
	const row = await createPatientVital(event, {
		hospitalId,
		patientId: body.patientId,
		visitId: body.visitId,
		statusId: 1,
		height: body.height,
		heightUnitId: body.heightUnitId,
		weight: body.weight,
		weightUnitId: body.weightUnitId,
		bpSystolic: body.bpSystolic,
		bpDiastolic: body.bpDiastolic,
		bpUnitId: body.bpUnitId,
		pulse: body.pulse,
		pulseUnitId: body.pulseUnitId,
		temperature: body.temperature,
		temperatureUnitId: body.temperatureUnitId,
		spO2: body.spO2,
		spO2UnitId: body.spO2UnitId,
		respiration: body.respiration,
		respirationUnitId: body.respirationUnitId,
		rbs: body.rbs,
		rbsUnitId: body.rbsUnitId,
		bmi: body.bmi,
		symptom: body.symptom,
		description: body.description,
		remark: body.remark,
		vitalDateTime: body.vitalDateTime
	} as any);
	return json({ data: row });
}

const patchSchema = createSchema
	.partial()
	.extend({ id: z.number().int().positive() });

export async function PATCH(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const body = patchSchema.parse(await event.request.json());
	const { id, ...patch } = body;
	const row = await updatePatientVital(event, { hospitalId, id, ...patch } as any);
	return json({ data: row });
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const id = Number(event.url.searchParams.get('id') ?? 0);
	await deletePatientVital(event, { hospitalId, id });
	return json({ ok: true });
}

