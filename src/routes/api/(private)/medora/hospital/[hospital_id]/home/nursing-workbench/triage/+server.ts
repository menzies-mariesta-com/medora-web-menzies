import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { getOrCreateHospitalPerioperativeSetting } from '$lib/server/medora/perioperative/hospital-perioperative-setting.server';
import { listEdBoard } from '$lib/server/medora/ed/ed-workbench.server';
import {
	ED_TRIAGE_QUEUE_COLUMNS,
	getEdTriageCurrent,
	saveEdTriage,
	type EdTriageAction
} from '$lib/server/medora/ed/ed-triage.server';
import { getTemplateByCode } from '$lib/server/medora/clinical-form/clinical-form.server';
import type { EdTriageVitals } from '$lib/model/type/medora/ed-workbench.type';
import { parseUuid } from '$lib/util/id.util';

function toVitals(raw: unknown): EdTriageVitals | undefined {
	if (raw == null || typeof raw !== 'object') return undefined;
	const src = raw as Record<string, unknown>;
	const num = (key: string): number | null => {
		const v = src[key];
		if (v == null || v === '') return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	};
	return {
		pulse: num('pulse'),
		respiration: num('respiration'),
		bpSystolic: num('bpSystolic'),
		bpDiastolic: num('bpDiastolic'),
		spO2: num('spO2'),
		temperature: num('temperature')
	};
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'queue';

	if (mode === 'settings') {
		return json(
			await getOrCreateHospitalPerioperativeSetting(hospitalId)
		);
	}

	if (mode === 'template') {
		return json(
			await getTemplateByCode({
				hospitalId,
				code: event.url.searchParams.get('code') ?? ''
			})
		);
	}

	if (mode === 'current') {
		const visitId = parseUuid(
			event.url.searchParams.get('visitId') ?? ''
		);
		if (!visitId) throw error(400, 'visitId is required');
		return json(await getEdTriageCurrent({ hospitalId, visitId }));
	}

	// Longest wait first: listEdBoard is ordered by arrival and carries the waits.
	const board = await listEdBoard({ hospitalId });
	return json(
		board
			.filter((r) => ED_TRIAGE_QUEUE_COLUMNS.includes(r.boardColumn))
			.sort((a, b) => b.waitMinutes - a.waitMinutes)
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const action = String(body.action ?? 'triage');
	if (
		action !== 'triage' &&
		action !== 'draft' &&
		action !== 'amend'
	) {
		throw error(400, 'Unknown action');
	}
	const triageAction = action as EdTriageAction;
	const visitId = parseUuid(body.visitId ?? '');
	if (!visitId) throw error(400, 'visitId is required');

	const instance = await saveEdTriage({
		hospitalId,
		visitId,
		action: triageAction,
		triageSystem: body.triageSystem
			? String(body.triageSystem)
			: undefined,
		templateCode: String(body.templateCode ?? ''),
		valuesJson: (body.valuesJson as Record<string, unknown>) ?? {},
		staffId,
		userId: event.locals.user?.id ?? null,
		triageSystemOverrideReason: body.triageSystemOverrideReason
			? String(body.triageSystemOverrideReason)
			: null,
		erBedId:
			body.erBedId != null && body.erBedId !== ''
				? Number(body.erBedId)
				: undefined,
		vitals: toVitals(body.vitals)
	});
	return json(instance);
}
