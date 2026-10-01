import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as xfer from '$lib/server/medora/adt/transfer-requisition.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function actorStaffId(event: RequestEvent): string | null {
	const staff = event.locals.staff;
	return staff?.id ? String(staff.id) : null;
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const statusRaw = event.url.searchParams.get('statusTaggingId');
	const statusTaggingId =
		statusRaw != null && statusRaw !== ''
			? Number(statusRaw)
			: undefined;
	return json(
		await xfer.getTransferRequisitionsPaginated({
			hospitalId,
			page,
			pageSize,
			statusTaggingId: Number.isFinite(statusTaggingId as number)
				? statusTaggingId
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const action = String(body.action ?? 'create');

	if (action === 'complete') {
		const id = Number(body.id);
		if (!Number.isFinite(id) || id <= 0)
			throw error(400, 'id is required');
		return json(
			await xfer.completeTransferRequisition({
				hospitalId,
				id,
				actorStaffId: actorStaffId(event)
			})
		);
	}

	if (action === 'cancel') {
		const id = Number(body.id);
		if (!Number.isFinite(id) || id <= 0)
			throw error(400, 'id is required');
		return json(
			await xfer.cancelTransferRequisition({ hospitalId, id })
		);
	}

	const admissionId = Number(body.admissionId);
	const fromBedId = Number(body.fromBedId);
	if (!Number.isFinite(admissionId) || admissionId <= 0)
		throw error(400, 'admissionId is required');
	if (!Number.isFinite(fromBedId) || fromBedId <= 0)
		throw error(400, 'fromBedId is required');

	return json(
		await xfer.createTransferRequisition({
			hospitalId,
			admissionId,
			fromBedId,
			toBedId:
				body.toBedId != null && body.toBedId !== ''
					? Number(body.toBedId)
					: null,
			toWardId:
				body.toWardId != null && body.toWardId !== ''
					? Number(body.toWardId)
					: null,
			remark: body.remark ?? null,
			requestedByStaffId: actorStaffId(event)
		})
	);
}
