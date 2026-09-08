import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import {
	createPatientAttachment,
	deletePatientAttachment,
	getPatientAttachmentsByPatientId,
	getPatientDisplayName,
	getVisitBasicsForPatientAttachment
} from '$lib/server/medora/patient/patient-attachment.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const action = event.url.searchParams.get('action') ?? 'list';

	if (action === 'visitBasics') {
		const visitId = Number(
			event.url.searchParams.get('visitId') ?? 0
		);
		const data = await getVisitBasicsForPatientAttachment(event, {
			hospitalId,
			visitId
		});
		return json({ data });
	}

	if (action === 'patientLabel') {
		const patientId = event.url.searchParams.get('patientId') ?? '';
		const data = await getPatientDisplayName(event, {
			hospitalId,
			patientId
		});
		return json({ data });
	}

	const patientId = event.url.searchParams.get('patientId') ?? '';
	const data = await getPatientAttachmentsByPatientId(event, {
		hospitalId,
		patientId
	});
	return json({ data });
}

const createSchema = z.object({
	patientId: z.string().min(1),
	fileUrl: z.string().min(1),
	description: z.string().optional()
});

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const body = createSchema.parse(await event.request.json());
	const row = await createPatientAttachment(event, {
		hospitalId,
		patientId: body.patientId,
		fileUrl: body.fileUrl,
		description: body.description?.trim() || null
	});
	return json({ data: row });
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const id = Number(event.url.searchParams.get('id') ?? 0);
	await deletePatientAttachment(event, { hospitalId, id });
	return json({ ok: true });
}
