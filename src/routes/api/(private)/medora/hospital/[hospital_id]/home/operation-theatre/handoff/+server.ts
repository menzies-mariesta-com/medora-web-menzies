import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	acknowledgeOtHandoff,
	listOtHandoff
} from '$lib/server/medora/operation-theatre/ot-handoff.server';
import type { OtHandoffStage } from '$lib/model/type/medora/operation-theatre.type';

const STAGES: OtHandoffStage[] = [
	'from_ward',
	'pre_op',
	'in_ot',
	'post_op'
];

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const branchId = event.url.searchParams.get('branchId') || null;
	const requested = (event.url.searchParams.get('stage') ?? 'all') as
		| OtHandoffStage
		| 'all';
	const stages = requested === 'all' ? STAGES : [requested];
	const result: Record<string, unknown> = {};
	await Promise.all(
		stages.map(async (stage) => {
			result[stage] = await listOtHandoff({
				hospitalId,
				branchId,
				stage
			});
		})
	);
	return json(result);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Body required');
	const stage = String(body.stage ?? '') as
		| OtHandoffStage
		| 'return_to_ward';
	if (
		![
			'from_ward',
			'pre_op',
			'in_ot',
			'post_op',
			'return_to_ward'
		].includes(stage)
	) {
		throw error(400, 'Unknown handoff stage');
	}
	return json(
		await acknowledgeOtHandoff({
			hospitalId,
			caseId: Number(body.caseId),
			stage,
			staffId: event.locals.staff?.id ?? null,
			wardRemarks:
				body.wardRemarks != null ? String(body.wardRemarks) : null
		})
	);
}
