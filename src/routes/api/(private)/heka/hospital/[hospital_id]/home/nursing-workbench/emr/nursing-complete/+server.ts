import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';
import {
	getNursingIncompleteLineCountForVisit,
	getServiceOrderDetailPaginatedForOrders,
	markServiceOrderDetailNursingComplete,
	markServiceOrderDetailNursingCompleteBatch
} from '$lib/server/heka/emr/nursing-complete.server';
import { getDocumentsWithRelations } from '$lib/server/heka/document-master/document.server';
import { getDocumentSettingsPaginated } from '$lib/server/heka/document-master/document-setting.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'visit.get': {
			const visitId = Number(event.url.searchParams.get('visitId') ?? '0');
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getPatientVisitById({ id: visitId, hospitalId }));
		}
		case 'serviceOrder.list': {
			const visitId = Number(event.url.searchParams.get('visitId') ?? '0');
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getServiceOrder({ visitId }));
		}
		case 'orderDetail.paginated': {
			const serviceOrderIds = event.url.searchParams
				.getAll('serviceOrderIds')
				.map((v) => Number(v))
				.filter((n) => Number.isFinite(n));
			if (!serviceOrderIds.length) throw error(400, 'serviceOrderIds is required');
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== '' ? Number(statusIdRaw) : undefined;
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
			return json(
				await getServiceOrderDetailPaginatedForOrders(event, {
					hospitalId,
					serviceOrderIds,
					statusId,
					page,
					pageSize
				})
			);
		}
		case 'nursingIncomplete.count': {
			const visitId = Number(event.url.searchParams.get('visitId') ?? '0');
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== '' ? Number(statusIdRaw) : undefined;
			return json(
				await getNursingIncompleteLineCountForVisit(event, {
					hospitalId,
					visitId,
					statusId
				})
			);
		}
		case 'documentMaster.list': {
			return json(await getDocumentsWithRelations(event));
		}
		case 'documentMaster.byCode': {
			const code = event.url.searchParams.get('code') ?? '';
			if (!code) throw error(400, 'code is required');
			const docs = await getDocumentsWithRelations(event);
			const found = (docs as any[]).find((d) => String(d?.code ?? '').trim() === code) ?? null;
			return json(found);
		}
		case 'documentSettings.list': {
			const settings = await getDocumentSettingsPaginated(event, {
				hospitalId,
				page: 1,
				pageSize: 1000
			});
			return json(settings.data);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request.json().catch(() => null)) as any;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'nursingComplete.mark': {
			const id = Number(body?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await markServiceOrderDetailNursingComplete(event, { hospitalId, id }));
		}
		case 'nursingComplete.markBatch': {
			const visitId = Number(body?.visitId ?? 0);
			const batchSize = Number(body?.batchSize ?? 0);
			const statusIdRaw = body?.statusId;
			const statusId =
				statusIdRaw != null && String(statusIdRaw).trim() !== '' ? Number(statusIdRaw) : undefined;
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			if (!Number.isFinite(batchSize) || batchSize <= 0) throw error(400, 'batchSize is required');
			return json(
				await markServiceOrderDetailNursingCompleteBatch(event, {
					hospitalId,
					visitId,
					batchSize,
					statusId
				})
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

