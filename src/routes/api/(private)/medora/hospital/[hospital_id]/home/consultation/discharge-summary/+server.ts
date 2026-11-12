import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as summary from '$lib/server/medora/clinical/discharge-summary.server';
import { parseUuid } from '$lib/util/id.util';

function requireVisitId(value: unknown): string {
	const visitId = parseUuid(value);
	if (!visitId) throw error(400, 'visitId is required');
	return visitId;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await summary.getDischargeSummary({
			hospitalId,
			visitId: requireVisitId(event.url.searchParams.get('visitId'))
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const input = { hospitalId, visitId: requireVisitId(body.visitId) };
	if (body.action === 'sign') {
		return json(await summary.signDischargeSummary(event, input));
	}
	return json(
		await summary.upsertDischargeSummary(event, {
			...input,
			hospitalCourse: String(body.hospitalCourse ?? ''),
			dischargeMedications: String(body.dischargeMedications ?? ''),
			followUp: String(body.followUp ?? ''),
			redFlags: String(body.redFlags ?? '')
		})
	);
}
