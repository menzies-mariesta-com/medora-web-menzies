import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as admissionOrder from '$lib/server/medora/ipd/admission-order.server';
import { IpdAdmissionOrderStatusTaggingEnum } from '$lib/model/enum/db-link';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const idRaw = event.url.searchParams.get('id');
	if (idRaw != null && idRaw !== '') {
		const id = Number(idRaw);
		if (!Number.isFinite(id) || id <= 0)
			throw error(400, 'id is invalid');
		const row = await admissionOrder.getAdmissionOrderById({
			hospitalId,
			id
		});
		if (!row) throw error(404, 'Admission order not found');
		return json(row);
	}

	const sourceOpdRaw = event.url.searchParams.get('sourceOpdVisitId');
	if (sourceOpdRaw != null && sourceOpdRaw !== '') {
		const sourceOpdVisitId = parseUuid(sourceOpdRaw);
		if (!sourceOpdVisitId) {
			throw error(400, 'sourceOpdVisitId is invalid');
		}
		const statusRaw = event.url.searchParams.get('statusTaggingId');
		const statusTaggingId =
			statusRaw != null && statusRaw !== ''
				? Number(statusRaw)
				: IpdAdmissionOrderStatusTaggingEnum.PENDING;
		if (
			statusTaggingId === IpdAdmissionOrderStatusTaggingEnum.PENDING
		) {
			return json(
				await admissionOrder.getPendingAdmissionOrderBySourceOpdVisit({
					hospitalId,
					sourceOpdVisitId
				})
			);
		}
		const listed = await admissionOrder.listAdmissionOrdersPaginated({
			hospitalId,
			page: 1,
			pageSize: 1,
			sourceOpdVisitId,
			statusTaggingId: Number.isFinite(statusTaggingId)
				? statusTaggingId
				: undefined
		});
		return json(listed.data[0] ?? null);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const search = event.url.searchParams.get('search') ?? undefined;
	const statusRaw = event.url.searchParams.get('statusTaggingId');
	const statusTaggingId =
		statusRaw != null && statusRaw !== ''
			? Number(statusRaw)
			: IpdAdmissionOrderStatusTaggingEnum.PENDING;
	return json(
		await admissionOrder.listAdmissionOrdersPaginated({
			hospitalId,
			page,
			pageSize,
			search,
			statusTaggingId: Number.isFinite(statusTaggingId)
				? statusTaggingId
				: IpdAdmissionOrderStatusTaggingEnum.PENDING
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const action = String(body.action ?? 'create');

	if (action === 'create') {
		const staff = event.locals.staff;
		return json(
			await admissionOrder.createAdmissionOrder({
				hospitalId,
				sourceOpdVisitId: parseUuid(body.sourceOpdVisitId) ?? '',
				careLevel: Number(body.careLevel),
				urgency: Number(body.urgency),
				preferredWardId:
					body.preferredWardId != null && body.preferredWardId !== ''
						? Number(body.preferredWardId)
						: null,
				notes: body.notes ?? null,
				orderingDoctorId:
					body.orderingDoctorId ?? (staff?.id ? String(staff.id) : null),
				branchId: String(body.branchId ?? '')
			})
		);
	}

	if (action === 'cancel') {
		const id = Number(body.id);
		if (!Number.isFinite(id) || id <= 0)
			throw error(400, 'id is required');
		await admissionOrder.cancelAdmissionOrder({ hospitalId, id });
		return json({ ok: true });
	}

	throw error(400, 'Unknown action');
}
