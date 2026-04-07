import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as emrVisitList from '$lib/server/heka/emr/visit-list.server';
import type { VisitStatusCode } from '$lib/model/type/heka/emr/visit-list.type';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'visitType.list': {
			return json(await emrVisitList.getVisitTypes());
		}
		case 'visit.bar': {
			const visitId = Number(event.url.searchParams.get('visitId') ?? '0');
			if (!Number.isFinite(visitId) || visitId <= 0) {
				throw error(400, 'visitId is required');
			}
			const visit = await emrVisitList.getPatientVisitByIdForDisplay(
				event,
				{ hospitalId, visitId }
			);
			const patientId =
				visit?.patient?.id != null ? String(visit.patient.id) : '';
			const [activeIds, abnormalIds] = await Promise.all([
				patientId
					? emrVisitList.getActivePatientAllergiesPatientIdsByPatientIds(
							{ patientIds: [patientId] }
						)
					: Promise.resolve([] as string[]),
				emrVisitList.getAbnormalVitalVisitIdsByVisitIds({
					visitIds: [visitId]
				})
			]);
			return json({
				visit,
				hasActiveAllergies: patientId
					? activeIds.includes(patientId)
					: false,
				hasAbnormalVital: abnormalIds.includes(visitId)
			});
		}
		case 'visit.list': {
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
			const visitNo = event.url.searchParams.get('visitNo') ?? undefined;
			const patientName = event.url.searchParams.get('patientName') ?? undefined;
			const patientCode = event.url.searchParams.get('patientCode') ?? undefined;
			const hospitalName = event.url.searchParams.get('hospitalName') ?? undefined;
			const branchName = event.url.searchParams.get('branchName') ?? undefined;
			const doctorName = event.url.searchParams.get('doctorName') ?? undefined;
			const visitTypeRaw = event.url.searchParams.get('visitType');
			const visitTypeId =
				visitTypeRaw != null && visitTypeRaw.trim() !== ''
					? Number(visitTypeRaw)
					: undefined;
			const visitStatusRaw = event.url.searchParams.get('visitStatus');
			const visitStatus = (visitStatusRaw != null && visitStatusRaw.trim() !== ''
				? visitStatusRaw
				: undefined) as VisitStatusCode | undefined;

			const result = await emrVisitList.getPatientVisitPaginatedForEmr(event, {
				hospitalId,
				page,
				pageSize,
				visitNo,
				patientName,
				patientCode,
				hospitalName,
				branchName,
				doctorName,
				visitTypeId,
				visitStatus
			});

			const patientIds = result.data
				.map((row) => row.patient?.id)
				.map((id) => (id != null ? String(id) : ''))
				.filter((id) => id.trim() !== '');
			const visitIds = result.data.map((row) => row.id);

			const [activeAllergyPatientIds, abnormalVitalVisitIds] =
				await Promise.all([
					emrVisitList.getActivePatientAllergiesPatientIdsByPatientIds({
						patientIds
					}),
					emrVisitList.getAbnormalVitalVisitIdsByVisitIds({ visitIds })
				]);

			return json({
				result,
				activeAllergyPatientIds,
				abnormalVitalVisitIds
			});
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request.json().catch(() => null)) as any;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'visit.markSeen': {
			const visitId = Number(body?.visitId ?? 0);
			if (!Number.isFinite(visitId) || visitId <= 0)
				throw error(400, 'visitId is required');
			await emrVisitList.markPatientVisitSeenOnDoctorSelect(event, {
				visitId
			});
			return json({ ok: true });
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
};

