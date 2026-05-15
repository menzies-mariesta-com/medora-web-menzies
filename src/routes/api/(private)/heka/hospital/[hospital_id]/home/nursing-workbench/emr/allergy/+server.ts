import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';

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
			const visitId = Number(
				event.url.searchParams.get('visitId') ?? '0'
			);
			if (!Number.isFinite(visitId) || visitId <= 0)
				throw error(400, 'visitId is required');
			return json(
				await obs.getPatientVisitById({ id: visitId, hospitalId })
			);
		}
		case 'allergy.listPaginated': {
			const patientId = event.url.searchParams.get('patientId') ?? '';
			if (!patientId) throw error(400, 'patientId is required');
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(
				event.url.searchParams.get('pageSize') ?? '10'
			);
			const visitNo =
				event.url.searchParams.get('visitNo') ?? undefined;
			const severityName =
				event.url.searchParams.get('severityName') ?? undefined;
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== ''
					? Number(statusIdRaw)
					: undefined;
			return json(
				await obs.getPatientAllergiesByPatientIdWithRelationsPaginated(
					{
						patientId,
						hospitalId,
						page,
						pageSize,
						visitNo,
						severityName,
						statusId
					}
				)
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	await obs.deletePatientAllergies({ id, skipClinicalLock: true });
	return json({ ok: true });
}

/** Mutations that bypass clinical sign lock (nursing workbench only). Reads stay on observation EMR. */
export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'allergyMaster.create': {
			const name = String(body?.name ?? '').trim();
			if (!name) throw error(400, 'name is required');
			return json(await obs.createAllergyMaster({ name }));
		}
		case 'patientAllergy.create': {
			const visitId = Number(body?.visitId);
			const patientId = String(body?.patientId ?? '').trim();
			const allergyId = Number(body?.allergyId);
			const severityId = Number(body?.severityId);
			if (!Number.isFinite(visitId) || visitId <= 0) {
				throw error(400, 'visitId is required');
			}
			if (!patientId) throw error(400, 'patientId is required');
			if (!Number.isFinite(allergyId) || allergyId <= 0) {
				throw error(400, 'allergyId is required');
			}
			if (!Number.isFinite(severityId) || severityId <= 0) {
				throw error(400, 'severityId is required');
			}
			return json(
				await obs.createPatientAllergyRecord(
					{
						visitId,
						patientId,
						allergyId,
						severityId,
						reaction:
							body?.reaction != null &&
							String(body.reaction).trim() !== ''
								? String(body.reaction).trim()
								: null,
						remark:
							body?.remark != null &&
							String(body.remark).trim() !== ''
								? String(body.remark).trim()
								: null
					},
					{ skipClinicalLock: true }
				)
			);
		}
		case 'patientAllergy.update': {
			const id = Number(body?.id);
			const severityId = Number(body?.severityId);
			const statusId = Number(body?.statusId);
			if (!Number.isFinite(id) || id <= 0)
				throw error(400, 'id is required');
			if (!Number.isFinite(severityId) || severityId <= 0) {
				throw error(400, 'severityId is required');
			}
			if (!Number.isFinite(statusId) || statusId <= 0) {
				throw error(400, 'statusId is required');
			}
			return json(
				await obs.updatePatientAllergyRecord(
					{
						id,
						severityId,
						statusId,
						reaction:
							body?.reaction != null &&
							String(body.reaction).trim() !== ''
								? String(body.reaction).trim()
								: null,
						remark:
							body?.remark != null &&
							String(body.remark).trim() !== ''
								? String(body.remark).trim()
								: null,
						deactivationRemark:
							body?.deactivationRemark != null &&
							String(body.deactivationRemark).trim() !== ''
								? String(body.deactivationRemark).trim()
								: null
					},
					{ skipClinicalLock: true }
				)
			);
		}
		case 'patientAllergy.inactivateAll': {
			const patientId = String(body?.patientId ?? '').trim();
			if (!patientId) throw error(400, 'patientId is required');
			await obs.inactivateAllPatientAllergiesForPatient({
				patientId,
				deactivationRemark: String(body?.deactivationRemark ?? '')
			});
			return json({ ok: true });
		}
		case 'patientAllergy.inactivateOthers': {
			const patientId = String(body?.patientId ?? '').trim();
			const excludeId = Number(body?.excludeId);
			if (!patientId) throw error(400, 'patientId is required');
			if (!Number.isFinite(excludeId) || excludeId <= 0) {
				throw error(400, 'excludeId is required');
			}
			await obs.inactivateOtherPatientAllergiesForPatient({
				patientId,
				excludeId,
				deactivationRemark: String(body?.deactivationRemark ?? '')
			});
			return json({ ok: true });
		}
		case 'patientAllergy.inactivateByAllergyId': {
			const patientId = String(body?.patientId ?? '').trim();
			const allergyId = Number(body?.allergyId);
			if (!patientId) throw error(400, 'patientId is required');
			if (!Number.isFinite(allergyId) || allergyId <= 0) {
				throw error(400, 'allergyId is required');
			}
			await obs.inactivatePatientAllergiesByAllergyIdForPatient({
				patientId,
				allergyId,
				deactivationRemark: String(body?.deactivationRemark ?? '')
			});
			return json({ ok: true });
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
