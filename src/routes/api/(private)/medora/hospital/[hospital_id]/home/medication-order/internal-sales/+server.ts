import { error, json, type RequestEvent } from '@sveltejs/kit';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as prescriptionNote from '$lib/server/medora/consultation/cpoe-prescription-note.server';
import * as mo from '$lib/server/medora/medication-order/medication-order-internal.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? '';

	if (mode === 'masters') {
		return json(
			await mo.listMastersForInternalForm(event, hospitalId)
		);
	}
	if (mode === 'stores.search') {
		const name = event.url.searchParams.get('name') ?? undefined;
		return json(
			await mo.searchStores(event, hospitalId, name ?? undefined)
		);
	}
	if (mode === 'items.search') {
		const storeId = Number(
			event.url.searchParams.get('storeId') ?? '0'
		);
		const search = event.url.searchParams.get('search') ?? undefined;
		const pharmacyGenericIdRaw = event.url.searchParams.get(
			'pharmacyGenericId'
		);
		const pharmacyGenericId =
			pharmacyGenericIdRaw != null && pharmacyGenericIdRaw !== ''
				? Number(pharmacyGenericIdRaw)
				: null;
		return json(
			await mo.searchItemNamePrice(event, {
				hospitalId,
				storeId,
				search: search?.trim() ? search.trim() : undefined,
				pharmacyGenericId:
					pharmacyGenericId != null &&
					Number.isFinite(pharmacyGenericId)
						? pharmacyGenericId
						: null
			})
		);
	}
	if (mode === 'batch.list') {
		const visitId = Number(
			event.url.searchParams.get('visitId') ?? '0'
		);
		if (!Number.isFinite(visitId) || visitId <= 0) {
			throw error(400, 'visitId is required');
		}
		return json(
			await mo.listBatchesByVisit(event, hospitalId, visitId)
		);
	}
	if (mode === 'batch.get') {
		const batchId = Number(
			event.url.searchParams.get('batchId') ?? '0'
		);
		if (!Number.isFinite(batchId) || batchId <= 0) {
			throw error(400, 'batchId is required');
		}
		const pack = await mo.getBatchWithLines(
			event,
			hospitalId,
			batchId
		);
		if (!pack) throw error(404, 'Not found');
		return json(pack);
	}
	if (mode === 'prescriptionNote.list') {
		const visitId = Number(
			event.url.searchParams.get('visitId') ?? '0'
		);
		if (!Number.isFinite(visitId) || visitId <= 0) {
			throw error(400, 'visitId is required');
		}
		const rows =
			await prescriptionNote.getCpoePrescriptionNoteRowsByVisitId({
				visitId,
				hospitalId
			});
		return json(
			rows.filter(
				(row) =>
					row.statusId == null ||
					row.statusId === StatusEnum.ACTIVE
			)
		);
	}

	throw error(400, `Unknown mode: ${mode}`);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body: unknown = await event.request.json().catch(() => null);
	const mode =
		typeof body === 'object' && body !== null
			? String((body as { mode?: unknown }).mode ?? '')
			: '';
	if (mode === 'batch.save') {
		const b = body as {
			visitId?: unknown;
			storeId?: unknown;
			lines?: unknown;
		};
		const visitId = Number(b.visitId ?? 0);
		const storeId = Number(b.storeId ?? 0);
		const lines = b.lines;
		if (!Array.isArray(lines)) throw error(400, 'lines is required');
		return json(
			await mo.saveMedicationOrderBatch(event, {
				hospitalId,
				visitId,
				storeId,
				lines: lines as Parameters<
					typeof mo.saveMedicationOrderBatch
				>[1]['lines']
			})
		);
	}
	if (mode === 'batch.reorder') {
		const b = body as { visitId?: unknown; sourceBatchId?: unknown };
		const visitId = Number(b.visitId ?? 0);
		const sourceBatchId = Number(b.sourceBatchId ?? 0);
		if (!Number.isFinite(visitId) || visitId <= 0) {
			throw error(400, 'visitId is required');
		}
		if (!Number.isFinite(sourceBatchId) || sourceBatchId <= 0) {
			throw error(400, 'sourceBatchId is required');
		}
		return json(
			await mo.reorderFromHistoryBatch(event, {
				hospitalId,
				visitId,
				sourceBatchId
			})
		);
	}
	if (mode === 'batch.update') {
		const b = body as {
			batchId?: unknown;
			lines?: unknown;
		};
		const batchId = Number(b.batchId ?? 0);
		if (!Number.isFinite(batchId) || batchId <= 0) {
			throw error(400, 'batchId is required');
		}
		if (!Array.isArray(b.lines))
			throw error(400, 'lines is required');
		return json(
			await mo.updateMedicationOrderBatch(event, {
				hospitalId,
				batchId,
				lines: b.lines as Parameters<
					typeof mo.updateMedicationOrderBatch
				>[1]['lines']
			})
		);
	}
	if (mode === 'batch.delete') {
		const b = body as { batchId?: unknown };
		const batchId = Number(b.batchId ?? 0);
		if (!Number.isFinite(batchId) || batchId <= 0) {
			throw error(400, 'batchId is required');
		}
		return json(
			await mo.deleteMedicationOrderBatch(event, hospitalId, batchId)
		);
	}
	throw error(400, 'mode is required');
}
