import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import {
	acceptReferHistory,
	cancelReferHistory,
	getReferHistoryPaginated,
	rejectReferHistory
} from '$lib/server/heka/cpoe/refer-history.server';

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
		case 'referHistory.paginated': {
			const visitIdRaw = event.url.searchParams.get('visitId') ?? '';
			const visitId =
				visitIdRaw.trim() !== '' ? Number(visitIdRaw) : undefined;
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(
				event.url.searchParams.get('pageSize') ?? '25'
			);
			const filtersRaw =
				event.url.searchParams.get('filters') ?? '{}';
			const filters = ((): Record<string, string> => {
				try {
					const parsed = JSON.parse(filtersRaw);
					return parsed && typeof parsed === 'object' ? parsed : {};
				} catch {
					return {};
				}
			})();

			return json(
				await getReferHistoryPaginated({
					visitId:
						visitId && Number.isFinite(visitId) && visitId > 0
							? visitId
							: undefined,
					page,
					pageSize,
					filters
				})
			);
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
		case 'referHistory.accept': {
			const id = Number(body?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			return json(
				await acceptReferHistory(event, hospitalId, {
					id,
					replyNote: body?.replyNote ?? undefined
				})
			);
		}
		case 'referHistory.reject': {
			const id = Number(body?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			await rejectReferHistory(event, hospitalId, {
				id,
				replyNote: body?.replyNote ?? undefined
			});
			return json({ ok: true });
		}
		case 'referHistory.cancel': {
			const id = Number(body?.id ?? 0);
			const cancelReason = String(body?.cancelReason ?? '').trim();
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			if (!cancelReason) throw error(400, 'cancelReason is required');
			await cancelReferHistory(event, hospitalId, {
				id,
				cancelReason
			});
			return json({ ok: true });
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
