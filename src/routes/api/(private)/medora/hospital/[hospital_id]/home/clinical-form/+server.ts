import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as clinicalForm from '$lib/server/medora/clinical-form/clinical-form.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'template') {
		const code = event.url.searchParams.get('code') ?? '';
		return json(
			await clinicalForm.getTemplateByCode({ hospitalId, code })
		);
	}
	return json(
		await clinicalForm.listFormInstances({
			hospitalId,
			visitId: event.url.searchParams.get('visitId') ?? undefined,
			surgicalCaseId: event.url.searchParams.get('surgicalCaseId')
				? Number(event.url.searchParams.get('surgicalCaseId'))
				: undefined,
			contextType:
				event.url.searchParams.get('contextType') ?? undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const visitId = String(body.visitId ?? '');
	if (!visitId) {
		return json({ error: 'visitId is required' }, { status: 400 });
	}
	return json(
		await clinicalForm.saveFormInstance({
			id: body.id ? Number(body.id) : undefined,
			hospitalId,
			visitId,
			surgicalCaseId:
				body.surgicalCaseId != null
					? Number(body.surgicalCaseId)
					: null,
			templateCode: String(body.templateCode ?? ''),
			contextType: String(body.contextType ?? ''),
			valuesJson: (body.valuesJson as Record<string, unknown>) ?? {},
			sign: Boolean(body.sign),
			staffId
		})
	);
}
