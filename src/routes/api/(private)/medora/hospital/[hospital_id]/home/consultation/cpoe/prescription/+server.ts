import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as prescriptionNote from '$lib/server/medora/consultation/cpoe-prescription-note.server';

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
		case 'prescriptionNote.list': {
			const visitId = Number(
				event.url.searchParams.get('visitId') ?? '0'
			);
			if (!Number.isFinite(visitId) || visitId <= 0)
				throw error(400, 'visitId is required');
			return json(
				await prescriptionNote.getCpoePrescriptionNoteRowsByVisitId({
					visitId,
					hospitalId
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

	const body = (await event.request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'prescriptionNote.create': {
			const visitId = Number(body?.visitId ?? 0);
			const note = String(body?.note ?? '');
			const doctorId =
				body?.doctorId != null ? String(body.doctorId) : null;
			if (!Number.isFinite(visitId) || visitId <= 0)
				throw error(400, 'visitId is required');
			try {
				return json(
					await prescriptionNote.createCpoePrescriptionNote(
						hospitalId,
						{ visitId, note, doctorId }
					)
				);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Create failed';
				throw error(400, message);
			}
		}
		case 'prescriptionNote.update': {
			const id = Number(body?.id ?? 0);
			const note = String(body?.note ?? '');
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			try {
				return json(
					await prescriptionNote.updateCpoePrescriptionNote(
						hospitalId,
						{ id, note }
					)
				);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Update failed';
				throw error(400, message);
			}
		}
		case 'prescriptionNote.delete': {
			const id = Number(body?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			const deleteRemark =
				body?.deleteRemark != null
					? String(body.deleteRemark)
					: null;
			try {
				await prescriptionNote.deleteCpoePrescriptionNote({
					id,
					hospitalId,
					deleteRemark
				});
				return json({ ok: true });
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Delete failed';
				throw error(400, message);
			}
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
