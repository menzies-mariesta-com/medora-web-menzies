import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';

function requireSessionStaffId(event: { locals: { staff?: { id?: string } | null } }): string {
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Unauthorized');
	return String(staffId);
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	const visitId = Number(event.url.searchParams.get('visitId') ?? '0');

	if (!mode) {
		throw error(400, 'mode is required');
	}

	switch (mode) {
		case 'visit.get': {
			if (!Number.isFinite(visitId) || visitId <= 0) {
				throw error(400, 'visitId is required');
			}
			const data = await obs.getPatientVisitById({ id: visitId, hospitalId });
			return json(data);
		}
		case 'allergy.listPaginated': {
			const patientId = event.url.searchParams.get('patientId') ?? '';
			if (!patientId) throw error(400, 'patientId is required');
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
			const visitNo = event.url.searchParams.get('visitNo');
			const severityName = event.url.searchParams.get('severityName');
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== '' ? Number(statusIdRaw) : undefined;
			return json(
				await obs.getPatientAllergiesByPatientIdWithRelationsPaginated({
					patientId,
					hospitalId,
					page,
					pageSize,
					visitNo,
					severityName,
					statusId
				})
			);
		}
		case 'allergy.list': {
			const patientId = event.url.searchParams.get('patientId') ?? '';
			if (!patientId) throw error(400, 'patientId is required');
			return json(await obs.getPatientAllergiesByPatientIdWithRelations({ patientId }));
		}
		case 'vital.listByVisit': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getPatientVitalsByVisitId({ visitId }));
		}
		case 'diagnosis.types': {
			return json(await obs.getDiagnosisTypes());
		}
		case 'diagnosis.list': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getDiagnosesByVisitId({ visitId }));
		}
		case 'diagnosis.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getDiagnosisById({ id }));
		}
		case 'planOfCare.list': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(
				await obs.getPlanOfCareRowsByVisitId({ visitId, hospitalId })
			);
		}
		case 'planOfCare.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getPlanOfCareById({ id, hospitalId }));
		}
		case 'progressNote.list': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(
				await obs.getProgressNoteRowsByVisitId({ visitId, hospitalId })
			);
		}
		case 'progressNote.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getProgressNoteById({ id, hospitalId }));
		}
		case 'formEntry.list': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			const formCode = event.url.searchParams.get('formCode') ?? '';
			return json(await obs.getPatientFormEntriesByVisitIdAndFormCode({ visitId, formCode }));
		}
		case 'formEntry.patientList': {
			const patientId = event.url.searchParams.get('patientId') ?? '';
			if (!patientId.trim()) throw error(400, 'patientId is required');
			const formCode = event.url.searchParams.get('formCode') ?? '';
			if (!formCode.trim()) throw error(400, 'formCode is required');
			return json(
				await obs.getPatientFormEntriesByPatientIdAndFormCode({
					patientId,
					formCode,
					hospitalId
				})
			);
		}
		case 'formEntry.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getPatientFormEntryById({ id }));
		}
		case 'patientDocument.visitList': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getPatientDocumentsByVisitIdWithRelations({ visitId }));
		}
		case 'patientDocument.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getPatientDocumentById({ id }));
		}
		case 'documentMaster.list': {
			return json(await obs.getDocumentsWithRelations());
		}
		case 'orderLine.list': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			const rows = await obs.getServiceOrderDetailRowsForVisit({ visitId });
			const locked = await obs.getServiceOrderDetailIdsOnClosedOpBillsForVisit({
				visitId
			});
			return json(
				rows.map((r) => ({
					...r,
					lockedByClosedOpBill: locked.has(r.id)
				}))
			);
		}
		case 'orderLine.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getServiceOrderDetailById({ id }));
		}
		case 'serviceOrder.list': {
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.getServiceOrder({ visitId }));
		}
		case 'serviceTagging.list': {
			const branchId = event.url.searchParams.get('branchId') ?? '';
			if (!branchId) throw error(400, 'branchId is required');
			const serviceIdRaw = event.url.searchParams.get('serviceId');
			const serviceId =
				serviceIdRaw != null && serviceIdRaw.trim() !== '' ? Number(serviceIdRaw) : undefined;
			return json(await obs.getServiceTagging({ branchId, serviceId }));
		}
		case 'serviceItem.list': {
			const serviceName = event.url.searchParams.get('serviceName') ?? undefined;
			const statusIdRaw = event.url.searchParams.get('statusId');
			const statusId =
				statusIdRaw != null && statusIdRaw.trim() !== '' ? Number(statusIdRaw) : undefined;
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
			return json(await obs.getServiceItemPaginated({ hospitalId, serviceName, statusId, page, pageSize }));
		}
		case 'serviceItem.get': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			const rows = await obs.getServiceItem({ hospitalId, statusId: null, id });
			return json(rows[0] ?? null);
		}
		case 'subCategory.byCategory': {
			const categoryId = Number(event.url.searchParams.get('categoryId') ?? '0');
			if (!Number.isFinite(categoryId) || categoryId <= 0) throw error(400, 'categoryId is required');
			return json(await obs.getSubCategoryByCategoryId({ categoryId }));
		}
		case 'doctor.search': {
			const search = event.url.searchParams.get('search') ?? '';
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
			return json(await obs.getDoctorStaffPaginated({ hospitalId, search, page, pageSize }));
		}
		case 'staff.get': {
			const id = event.url.searchParams.get('id') ?? '';
			return json(await obs.getStaffByIdWithRelations({ id }));
		}
		case 'allergyMaster.list': {
			return json(await obs.listAllergiesMaster());
		}
		case 'allergyMaster.byId': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getAllergyMasterById({ id }));
		}
		case 'allergyMaster.paginated': {
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(event.url.searchParams.get('pageSize') ?? '50');
			const search = event.url.searchParams.get('search') ?? undefined;
			return json(
				await obs.getAllergyMasterPaginated({ page, pageSize, search })
			);
		}
		case 'patientAllergy.byId': {
			const id = Number(event.url.searchParams.get('id') ?? '0');
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(await obs.getPatientAllergyRowById({ id }));
		}
		case 'patientAllergy.activeByPatient': {
			const patientId = event.url.searchParams.get('patientId') ?? '';
			if (!patientId) throw error(400, 'patientId is required');
			return json(
				await obs.getActivePatientAllergiesRowsByPatientId({ patientId })
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const body: unknown = await event.request.json().catch(() => null);
	const mode =
		typeof body === 'object' && body !== null
			? String((body as { mode?: unknown }).mode ?? '')
			: '';
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'visit.sign': {
			const visitId = Number(body?.visitId ?? 0);
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.signPatientVisitClinical({ visitId }));
		}
		case 'visit.unsign': {
			const visitId = Number(body?.visitId ?? 0);
			if (!Number.isFinite(visitId) || visitId <= 0) throw error(400, 'visitId is required');
			return json(await obs.unsignPatientVisitClinical({ visitId }));
		}
		case 'visit.updateText': {
			const id = Number(body?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(
				await obs.updatePatientVisit({
					id,
					chiefComplaint: body?.chiefComplaint ?? undefined,
					patientCondition: body?.patientCondition ?? undefined,
					diagnosisNotes: body?.diagnosisNotes ?? undefined
				})
			);
		}
		case 'diagnosis.create': {
			return json(await obs.createDiagnosis(body?.payload));
		}
		case 'diagnosis.update': {
			return json(await obs.updateDiagnosis(body?.payload));
		}
		case 'diagnosis.delete': {
			await obs.deleteDiagnosis({ id: Number(body?.id ?? 0) });
			return json({ ok: true });
		}
		case 'planOfCare.create': {
			const visitIdCreate = Number(body?.visitId ?? 0);
			if (!Number.isFinite(visitIdCreate) || visitIdCreate <= 0) {
				throw error(400, 'visitId is required');
			}
			const doctorStaffId = requireSessionStaffId(event);
			return json(
				await obs.createPlanOfCare(hospitalId, {
					visitId: visitIdCreate,
					note: String(body?.note ?? ''),
					doctorId: doctorStaffId,
					statusId:
						body?.statusId != null && body?.statusId !== ''
							? Number(body.statusId)
							: undefined
				})
			);
		}
		case 'planOfCare.update': {
			const p = body?.payload ?? body;
			const id = Number(p?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			const doctorStaffId = requireSessionStaffId(event);
			return json(
				await obs.updatePlanOfCare(hospitalId, {
					id,
					note: p?.note,
					doctorId: doctorStaffId,
					statusId:
						p?.statusId != null && p?.statusId !== ''
							? Number(p.statusId)
							: undefined
				})
			);
		}
		case 'planOfCare.delete': {
			await obs.deletePlanOfCare({
				id: Number(body?.id ?? 0),
				hospitalId,
				deleteRemark: body?.deleteRemark ?? null
			});
			return json({ ok: true });
		}
		case 'progressNote.create': {
			const visitIdCreate = Number(body?.visitId ?? 0);
			if (!Number.isFinite(visitIdCreate) || visitIdCreate <= 0) {
				throw error(400, 'visitId is required');
			}
			return json(
				await obs.createProgressNote(hospitalId, {
					visitId: visitIdCreate,
					note: String(body?.note ?? ''),
					doctorId: body?.doctorId ?? null,
					statusId:
						body?.statusId != null && body?.statusId !== ''
							? Number(body.statusId)
							: undefined
				})
			);
		}
		case 'progressNote.update': {
			const p = body?.payload ?? body;
			const id = Number(p?.id ?? 0);
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			return json(
				await obs.updateProgressNote(hospitalId, {
					id,
					note: p?.note,
					doctorId: p?.doctorId,
					statusId:
						p?.statusId != null && p?.statusId !== ''
							? Number(p.statusId)
							: undefined
				})
			);
		}
		case 'progressNote.delete': {
			await obs.deleteProgressNote({
				id: Number(body?.id ?? 0),
				hospitalId,
				deleteRemark: body?.deleteRemark ?? null
			});
			return json({ ok: true });
		}
		case 'allergy.delete': {
			await obs.deletePatientAllergies({ id: Number(body?.id ?? 0) });
			return json({ ok: true });
		}
		case 'vital.delete': {
			await obs.deletePatientVital({ id: Number(body?.id ?? 0) });
			return json({ ok: true });
		}
		case 'formEntry.create': {
			return json(await obs.createPatientFormEntry(body?.payload));
		}
		case 'formEntry.update': {
			return json(await obs.updatePatientFormEntry(body?.payload));
		}
		case 'formEntry.delete': {
			await obs.deletePatientFormEntry({ id: Number(body?.id ?? 0) });
			return json({ ok: true });
		}
		case 'patientDocument.create': {
			return json(await obs.createPatientDocument(body?.payload));
		}
		case 'patientDocument.update': {
			return json(await obs.updatePatientDocument(body?.payload));
		}
		case 'orderLine.createDetail': {
			return json(await obs.createServiceOrderDetail(body?.payload));
		}
		case 'orderLine.updateDetail': {
			return json(await obs.updateServiceOrderDetail(body?.payload));
		}
		case 'orderLine.deleteDetail': {
			await obs.deleteServiceOrderDetail({ id: Number(body?.id ?? 0) });
			return json({ ok: true });
		}
		case 'orderLine.createOrder': {
			return json(await obs.createServiceOrder(event, body?.payload));
		}
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
				await obs.createPatientAllergyRecord({
					visitId,
					patientId,
					allergyId,
					severityId,
					reaction:
						body?.reaction != null && String(body.reaction).trim() !== ''
							? String(body.reaction).trim()
							: null,
					remark:
						body?.remark != null && String(body.remark).trim() !== ''
							? String(body.remark).trim()
							: null
				})
			);
		}
		case 'patientAllergy.update': {
			const id = Number(body?.id);
			const severityId = Number(body?.severityId);
			const statusId = Number(body?.statusId);
			if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
			if (!Number.isFinite(severityId) || severityId <= 0) {
				throw error(400, 'severityId is required');
			}
			if (!Number.isFinite(statusId) || statusId <= 0) {
				throw error(400, 'statusId is required');
			}
			return json(
				await obs.updatePatientAllergyRecord({
					id,
					severityId,
					statusId,
					reaction:
						body?.reaction != null && String(body.reaction).trim() !== ''
							? String(body.reaction).trim()
							: null,
					remark:
						body?.remark != null && String(body.remark).trim() !== ''
							? String(body.remark).trim()
							: null,
					deactivationRemark:
						body?.deactivationRemark != null &&
						String(body.deactivationRemark).trim() !== ''
							? String(body.deactivationRemark).trim()
							: null
				})
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
};

