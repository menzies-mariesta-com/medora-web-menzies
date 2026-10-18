import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { getOrCreateHospitalPerioperativeSetting } from '$lib/server/medora/perioperative/hospital-perioperative-setting.server';
import * as ed from '$lib/server/medora/ed/ed-workbench.server';

function parseUuid(value: unknown, name: string): string {
	const s = String(value ?? '').trim();
	if (!s) throw error(400, `${name} is required`);
	return s;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'board';
	if (mode === 'settings') {
		return json(await getOrCreateHospitalPerioperativeSetting(hospitalId));
	}
	if (mode === 'trauma') {
		return json(await ed.listTraumaActivations({ hospitalId }));
	}
	return json(await ed.listEdBoard({ hospitalId }));
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');

	if (action === 'ensure_encounter') {
		return json(
			await ed.ensureEdEncounter({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId')
			})
		);
	}
	if (action === 'transfer_bed') {
		const erBedId = Number(body.erBedId);
		if (!Number.isFinite(erBedId) || erBedId <= 0) {
			throw error(400, 'erBedId is required');
		}
		return json(
			await ed.assignEdErBed({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				erBedId,
				userId: event.locals.user?.id ?? null
			})
		);
	}
	if (action === 'assign_bed') {
		const erBedId = Number(body.erBedId);
		if (!Number.isFinite(erBedId) || erBedId <= 0) {
			throw error(400, 'erBedId is required');
		}
		return json(
			await ed.assignEdErBed({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				erBedId,
				userId: event.locals.user?.id ?? null
			})
		);
	}
	if (action === 'discharge') {
		const { dischargeEdEncounter } = await import(
			'$lib/server/medora/ed/ed-discharge.server'
		);
		return json(
			await dischargeEdEncounter({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				dischargeRemarks:
					body.dischargeRemarks != null
						? String(body.dischargeRemarks)
						: null,
				retainErBedAfterDischarge: Boolean(
					body.retainErBedAfterDischarge
				),
				dischargedAt:
					body.dischargedAt != null
						? String(body.dischargedAt)
						: null
			})
		);
	}
	if (action === 'board_column') {
		const erBedIdRaw = body.erBedId;
		const erBedId =
			erBedIdRaw != null && erBedIdRaw !== ''
				? Number(erBedIdRaw)
				: undefined;
		return json(
			await ed.updateEdBoardColumn({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				boardColumn: String(body.boardColumn),
				fastTrack:
					body.fastTrack != null ? Boolean(body.fastTrack) : undefined,
				assignedDoctorId:
					body.assignedDoctorId != null
						? String(body.assignedDoctorId)
						: undefined,
				erBedId: Number.isFinite(erBedId as number)
					? erBedId
					: undefined
			})
		);
	}
	if (action === 'triage') {
		return json(
			await ed.saveEdTriage({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				triageSystem: body.triageSystem
					? String(body.triageSystem)
					: undefined,
				templateCode: String(body.templateCode ?? ''),
				valuesJson:
					(body.valuesJson as Record<string, unknown>) ?? {},
				sign: Boolean(body.sign),
				staffId,
				triageSystemOverrideReason: body.triageSystemOverrideReason
					? String(body.triageSystemOverrideReason)
					: null,
				erBedId:
					body.erBedId != null && body.erBedId !== ''
						? Number(body.erBedId)
						: undefined
			})
		);
	}
	if (action === 'trauma_activate') {
		if (!staffId) throw error(401, 'Unauthorized');
		return json(
			await ed.activateTrauma({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				levelCode: String(body.levelCode ?? 'II'),
				staffId,
				valuesJson: body.valuesJson as
					| Record<string, unknown>
					| undefined
			})
		);
	}
	if (action === 'trauma_deactivate') {
		await ed.deactivateTrauma({
			hospitalId,
			id: Number(body.id)
		});
		return json({ ok: true });
	}
	throw error(400, 'Unknown action');
}
