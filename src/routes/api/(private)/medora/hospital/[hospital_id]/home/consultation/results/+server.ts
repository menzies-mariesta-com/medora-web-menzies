import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { requireClinicalStaff } from '$lib/server/medora/clinical/clinical-authority.server';
import * as results from '$lib/server/medora/clinical/results.server';

function positiveInt(value: unknown, name: string): number {
	const id = Number(value);
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, `${name} is required`);
	return id;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await results.listResults({
			hospitalId,
			visitId: positiveInt(
				event.url.searchParams.get('visitId'),
				'visitId'
			)
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staff = requireClinicalStaff(event);
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const action = String(body.action ?? 'saveLab');
	if (action === 'endorse') {
		return json(
			await results.endorseResult({
				kind: body.kind === 'imaging' ? 'imaging' : 'lab',
				id: positiveInt(body.id, 'id'),
				hospitalId,
				staffId: staff.id
			})
		);
	}
	if (action === 'delete') {
		await results.deleteResult({
			kind: body.kind === 'imaging' ? 'imaging' : 'lab',
			id: positiveInt(body.id, 'id'),
			hospitalId
		});
		return json({ ok: true });
	}
	const visitId = positiveInt(body.visitId, 'visitId');
	const id = body.id ? positiveInt(body.id, 'id') : undefined;
	const serviceOrderDetailId = body.serviceOrderDetailId
		? positiveInt(body.serviceOrderDetailId, 'serviceOrderDetailId')
		: null;
	if (action === 'saveImaging') {
		return json(
			await results.saveImagingResult({
				id,
				hospitalId,
				visitId,
				serviceOrderDetailId,
				findings: String(body.findings ?? ''),
				attachmentUrl: body.attachmentUrl
					? String(body.attachmentUrl)
					: null,
				enteredBy: staff.id
			})
		);
	}
	return json(
		await results.saveLabResult({
			id,
			hospitalId,
			visitId,
			serviceOrderDetailId,
			resultText: String(body.resultText ?? ''),
			resultJson: body.resultJson ? String(body.resultJson) : null,
			isCritical: body.isCritical === true,
			enteredBy: staff.id
		})
	);
}
