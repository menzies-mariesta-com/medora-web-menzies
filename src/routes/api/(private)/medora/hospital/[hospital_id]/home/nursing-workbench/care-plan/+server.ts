import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as carePlan from '$lib/server/medora/clinical/nursing-care-plan.server';
import { visitPatientIdentity } from '$lib/server/medora/visit/visit-context.server';
import type { CarePlanContent } from '$lib/model/type/medora/clinical-platform.type';
import { readCarePlanContent } from '$lib/tool/nursing/care-plan.util';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function readContent(body: Record<string, unknown>): CarePlanContent {
	const parsed = readCarePlanContent(body.contentJson);
	if (!parsed.ok) throw error(400, 'contentJson is required');
	return parsed.content;
}

/** Body shape accepted by POST/PUT; `patientId`/`branchId` are visit-derived, never trusted. */
function readWriteBody(
	event: RequestEvent,
	body: Record<string, unknown>
) {
	const visitId = parseUuid(body.visitId);
	const templateId = Number(body.templateId);
	if (!visitId) throw error(400, 'visitId is required');
	if (!Number.isFinite(templateId) || templateId <= 0) {
		throw error(400, 'templateId is required');
	}
	const staffId = event.locals.staff?.id ?? null;
	return {
		hospitalId: hospitalIdFrom(event),
		visitId,
		templateId,
		contentJson: readContent(body),
		sign: Boolean(body.sign),
		staffId
	};
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'list';
	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	if (mode === 'templates') {
		return json(await carePlan.listCarePlanTemplates(hospitalId));
	}
	if (!visitId) throw error(400, 'visitId is required');
	if (mode === 'patient') {
		return json(await visitPatientIdentity({ hospitalId, visitId }));
	}
	if (mode !== 'list') throw error(400, `Unknown mode: ${mode}`);
	return json(
		await carePlan.listCarePlanInstances({ hospitalId, visitId })
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const input = readWriteBody(
		event,
		(await event.request.json()) as Record<string, unknown>
	);
	return json({ id: await carePlan.createCarePlanInstance(input) });
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const id = body.id != null ? Number(body.id) : undefined;
	const supersedesId =
		body.supersedesId != null ? Number(body.supersedesId) : undefined;
	if (id == null && supersedesId == null) {
		throw error(400, 'id or supersedesId is required');
	}
	return json({
		id: await carePlan.updateCarePlanInstance({
			...readWriteBody(event, body),
			id,
			supersedesId
		})
	});
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? 0);
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	await carePlan.deleteCarePlanInstance({ hospitalId, id });
	return json({ ok: true });
}
