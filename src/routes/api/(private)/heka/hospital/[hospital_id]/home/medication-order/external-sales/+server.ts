import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as ex from '$lib/server/heka/medication-order/medication-order-external.server';
import * as internal from '$lib/server/heka/medication-order/medication-order-internal.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? '';

	if (mode === 'masters') {
		return json(await ex.listMastersForInternalForm(event, hospitalId));
	}
	if (mode === 'stores.search') {
		const name = event.url.searchParams.get('name') ?? undefined;
		return json(await ex.searchStores(event, hospitalId, name ?? undefined));
	}
	if (mode === 'items.search') {
		const storeId = Number(event.url.searchParams.get('storeId') ?? '0');
		const search = event.url.searchParams.get('search') ?? undefined;
		const pharmacyGenericIdRaw = event.url.searchParams.get('pharmacyGenericId');
		const pharmacyGenericId =
			pharmacyGenericIdRaw != null && pharmacyGenericIdRaw !== ''
				? Number(pharmacyGenericIdRaw)
				: null;
		return json(
			await ex.searchItemNamePrice(event, {
				hospitalId,
				storeId,
				search: search?.trim() ? search.trim() : undefined,
				pharmacyGenericId:
					pharmacyGenericId != null && Number.isFinite(pharmacyGenericId)
						? pharmacyGenericId
						: null
			})
		);
	}
	if (mode === 'batch.list') {
		return json(await ex.listExternalBatches(event, hospitalId));
	}
	if (mode === 'batch.get') {
		const batchId = Number(event.url.searchParams.get('batchId') ?? '0');
		if (!Number.isFinite(batchId) || batchId <= 0) {
			throw error(400, 'batchId is required');
		}
		const pack = await internal.getBatchWithLines(event, hospitalId, batchId);
		if (!pack) throw error(404, 'Not found');
		if (pack.batch.visitId != null) {
			throw error(400, 'Not an external sale batch');
		}
		return json(pack);
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
			storeId?: unknown;
			lines?: unknown;
			extCustomerName?: unknown;
			advisingDoctor?: unknown;
		};
		const storeId = Number(b.storeId ?? 0);
		const extCustomerName = String(b.extCustomerName ?? '');
		const advisingDoctor = String(b.advisingDoctor ?? '');
		const lines = b.lines;
		if (!Array.isArray(lines)) throw error(400, 'lines is required');
		return json(
			await ex.saveMedicationOrderBatchExternal(event, {
				hospitalId,
				storeId,
				extCustomerName,
				advisingDoctor,
				lines: lines as Parameters<
					typeof ex.saveMedicationOrderBatchExternal
				>[1]['lines']
			})
		);
	}
	if (mode === 'batch.update') {
		const b = body as { batchId?: unknown; lines?: unknown };
		const batchId = Number(b.batchId ?? 0);
		if (!Number.isFinite(batchId) || batchId <= 0) {
			throw error(400, 'batchId is required');
		}
		if (!Array.isArray(b.lines)) throw error(400, 'lines is required');
		return json(
			await ex.updateMedicationOrderBatchExternal(event, {
				hospitalId,
				batchId,
				lines: b.lines as Parameters<
					typeof ex.updateMedicationOrderBatchExternal
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
			await ex.deleteMedicationOrderBatchExternal(event, hospitalId, batchId)
		);
	}
	if (mode === 'batch.reorder') {
		const b = body as { sourceBatchId?: unknown };
		const sourceBatchId = Number(b.sourceBatchId ?? 0);
		if (!Number.isFinite(sourceBatchId) || sourceBatchId <= 0) {
			throw error(400, 'sourceBatchId is required');
		}
		return json(
			await ex.reorderFromHistoryBatchExternal(event, {
				hospitalId,
				sourceBatchId
			})
		);
	}
	throw error(400, 'mode is required');
}
