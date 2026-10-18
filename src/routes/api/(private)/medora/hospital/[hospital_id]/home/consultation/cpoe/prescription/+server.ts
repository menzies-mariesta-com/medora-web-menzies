import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as prescriptionNote from '$lib/server/medora/consultation/cpoe-prescription-note.server';
import * as medication from '$lib/server/medora/clinical/cpoe-medication-order.server';
import * as cds from '$lib/server/medora/clinical/prescribing-cds.server';
import * as formulary from '$lib/server/medora/clinical/formulary.server';
import * as orderSet from '$lib/server/medora/clinical/order-set.server';
import { requireClinicalStaff } from '$lib/server/medora/clinical/clinical-authority.server';
import { parseUuid } from '$lib/util/id.util';

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
		case 'medication.masters':
			return json(
				await medication.listMastersForInternalForm(event, hospitalId)
			);
		case 'medication.stores':
			return json(
				await medication.searchStores(
					event,
					hospitalId,
					event.url.searchParams.get('search') ?? undefined
				)
			);
		case 'medication.items':
			return json(
				await medication.searchMedicationItems({
					hospitalId,
					search: event.url.searchParams.get('search') ?? undefined
				})
			);
		case 'orderSet.list':
			return json(await orderSet.listOrderSets(hospitalId));
		case 'orderSet.get': {
			const id = Number(event.url.searchParams.get('id') ?? 0);
			return json(
				await orderSet.getOrderSetWithLines({ hospitalId, orderSetId: id })
			);
		}
		case 'formulary.tier': {
			const itemMasterId = Number(
				event.url.searchParams.get('itemMasterId') ?? 0
			);
			return json({
				tier: await formulary.getFormularyTierForItem({
					hospitalId,
					itemMasterId
				})
			});
		}
		case 'prescriptionNote.list': {
			const visitId = parseUuid(event.url.searchParams.get('visitId'));
			if (!visitId)
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

	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'medication.cosign':
			return json(
				await medication.cosignMedicationOrder(event, {
					hospitalId,
					batchId: Number(body?.batchId ?? 0)
				})
			);
		case 'medication.overrideAlerts': {
			const staff = requireClinicalStaff(event);
			await cds.overridePrescribingAlerts({
				hospitalId,
				alertIds: (body?.alertIds as number[]) ?? [],
				reasonCode: String(body?.reasonCode ?? ''),
				remark: String(body?.remark ?? ''),
				staffId: staff.id
			});
			return json({ ok: true });
		}
		case 'medication.screenDraft': {
			const visitId = parseUuid(body?.visitId);
			const staff = requireClinicalStaff(event);
			if (!visitId) throw error(400, 'visitId is required');
			const lines = (body?.lines as { itemMasterId: number }[]) ?? [];
			return json(
				await cds.screenDraftMedicationOrder({
					hospitalId,
					visitId,
					itemMasterIds: lines.map((l) => l.itemMasterId),
					staffId: staff.id,
					batchId: body?.batchId != null ? Number(body.batchId) : null
				})
			);
		}
		case 'medication.createDraft': {
			const visitId = parseUuid(body?.visitId);
			const storeId = Number(body?.storeId ?? 0);
			if (!Array.isArray(body?.lines))
				throw error(400, 'lines is required');
			return json(
				await medication.createDraftMedicationOrder(event, {
					hospitalId,
					visitId,
					storeId,
					lines: body.lines as medication.DraftMedicationLine[]
				})
			);
		}
		case 'prescriptionNote.create': {
			const visitId = parseUuid(body?.visitId);
			const note = String(body?.note ?? '');
			const doctorId =
				body?.doctorId != null ? String(body.doctorId) : null;
			if (!visitId)
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
				body?.deleteRemark != null ? String(body.deleteRemark) : null;
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
