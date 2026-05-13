import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
	AppointmentCreatePayload,
	AppointmentUpdatePayload
} from '$lib/model/type/heka/appointment.type';
import type {
	AppointmentBlockSchemaInsert,
	AppointmentBlockSchemaUpdate,
	AppointmentSchemaInsert,
	AppointmentSchemaUpdate
} from '$lib/server/db/schema-type';
import {
	createAppointment,
	createAppointmentBlock,
	deleteAppointment,
	deleteAppointmentBlock,
	getDoctorByIdWithRelations,
	getDoctorStaffPaginated,
	getAppointmentById,
	getAppointmentCancelEligibility,
	listAppointmentBlocks,
	listAppointments,
	listAppointmentsWithRelations,
	listDoctorStaff,
	listDoctorSchedules,
	listExternalRefers,
	listReferTypes,
	listStatusTaggings,
	listTitles,
	updateAppointment,
	updateAppointmentBlock
} from '$lib/server/heka/appointment/appointment.server';
import {
	getPatientByIdWithRelations,
	getPatientListPaginated
} from '$lib/server/heka/registration/patient.server';
import { createPatientVisitInHospital } from '$lib/server/heka/patient-visit/patient-visit.server';

type PatientVisitCreateApiPayload = Parameters<
	typeof createPatientVisitInHospital
>[1];

type Mode =
	| 'doctor.paginated'
	| 'doctor.byId'
	| 'doctor.list'
	| 'doctorSchedule.list'
	| 'appointment.list'
	| 'appointment.withRelations'
	| 'appointment.byId'
	| 'appointment.create'
	| 'appointment.update'
	| 'appointment.delete'
	| 'appointment.cancelEligibility'
	| 'appointmentBlock.list'
	| 'appointmentBlock.create'
	| 'appointmentBlock.update'
	| 'appointmentBlock.delete'
	| 'patient.paginated'
	| 'patient.byId'
	| 'title.list'
	| 'referType.list'
	| 'externalRefer.list'
	| 'statusTagging.list'
	| 'patientVisit.create';

function modeFromUrl(event: Parameters<RequestHandler>[0]): Mode {
	return (event.url.searchParams.get('mode') ?? '') as Mode;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = modeFromUrl(event);

	if (mode === 'doctor.byId') {
		const id = event.url.searchParams.get('id') ?? '';
		const data = await getDoctorByIdWithRelations(event, {
			hospitalId,
			id
		});
		return json(data);
	}

	if (mode === 'doctor.paginated') {
		const page = Number(event.url.searchParams.get('page') ?? '1');
		const pageSize = Number(
			event.url.searchParams.get('pageSize') ?? '10'
		);
		const search = event.url.searchParams.get('search') ?? undefined;
		const branchId =
			event.url.searchParams.get('branchId') ?? undefined;
		const data = await getDoctorStaffPaginated(event, {
			hospitalId,
			page,
			pageSize,
			search,
			branchId
		});
		return json(data);
	}

	if (mode === 'doctor.list') {
		// This route is used for sidebar "doctorList" (includes staffBranches).
		const branchId =
			event.url.searchParams.get('branchId') ?? undefined;
		const data = await listDoctorStaff(event, {
			hospitalId,
			branchId
		});
		return json(data);
	}

	if (mode === 'doctorSchedule.list') {
		const branchId =
			event.url.searchParams.get('branchId') ?? undefined;
		const data = await listDoctorSchedules(event, {
			hospitalId,
			branchId
		});
		return json(data);
	}

	if (mode === 'appointment.list') {
		const branchId =
			event.url.searchParams.get('branchId') ?? undefined;
		const data = await listAppointments(event, {
			hospitalId,
			branchId
		});
		return json(data);
	}

	if (mode === 'appointment.withRelations') {
		const branchId =
			event.url.searchParams.get('branchId') ?? undefined;
		const data = await listAppointmentsWithRelations(event, {
			hospitalId,
			branchId
		});
		return json(data);
	}

	if (mode === 'appointment.byId') {
		const id = Number(event.url.searchParams.get('id') ?? '0');
		const data = await getAppointmentById(event, { hospitalId, id });
		return json(data);
	}

	if (mode === 'appointmentBlock.list') {
		const staffId = event.url.searchParams.get('staffId') ?? '';
		const data = await listAppointmentBlocks(event, {
			hospitalId,
			staffId
		});
		return json(data);
	}

	if (mode === 'patient.paginated') {
		const page = Number(event.url.searchParams.get('page') ?? '1');
		const pageSize = Number(
			event.url.searchParams.get('pageSize') ?? '10'
		);
		const search = event.url.searchParams.get('search') ?? undefined;
		const data = await getPatientListPaginated(event, {
			hospitalId,
			page,
			pageSize,
			search
		});
		return json(data);
	}

	if (mode === 'patient.byId') {
		const id = event.url.searchParams.get('id') ?? '';
		const data = await getPatientByIdWithRelations(event, {
			hospitalId,
			id
		});
		return json(data);
	}

	if (mode === 'title.list') return json(await listTitles(event));
	if (mode === 'referType.list')
		return json(await listReferTypes(event));
	if (mode === 'externalRefer.list')
		return json(await listExternalRefers(event, { hospitalId }));
	if (mode === 'statusTagging.list')
		return json(await listStatusTaggings(event));

	return json({ error: 'Unknown mode' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as {
		mode?: Mode;
		[k: string]: unknown;
	};
	const mode = body.mode as Mode;

	if (mode === 'appointment.create') {
		const payload = body.payload as AppointmentCreatePayload;
		const created = await createAppointment(event, {
			...payload,
			hospitalId
		} as AppointmentSchemaInsert);
		return json(created);
	}
	if (mode === 'appointment.update') {
		const payload = body.payload as AppointmentUpdatePayload & {
			id?: unknown;
		};
		const id = Number(payload.id);
		if (!Number.isFinite(id) || id <= 0) {
			throw error(400, 'Invalid appointment id');
		}
		const updated = await updateAppointment(event, {
			...payload,
			id,
			hospitalId
		} as AppointmentSchemaUpdate & {
			id: number;
			hospitalId: string;
		});
		return json(updated);
	}
	if (mode === 'appointment.delete') {
		const id = Number(body.id ?? 0);
		await deleteAppointment(event, { hospitalId, id });
		return json({ ok: true });
	}
	if (mode === 'appointment.cancelEligibility') {
		const appointmentId = Number(body.appointmentId ?? 0);
		const res = await getAppointmentCancelEligibility(event, {
			hospitalId,
			appointmentId
		});
		return json(res);
	}
	if (mode === 'appointmentBlock.create') {
		const payload = body.payload as AppointmentBlockSchemaInsert;
		const created = await createAppointmentBlock(event, {
			...payload,
			hospitalId
		});
		return json(created);
	}
	if (mode === 'appointmentBlock.update') {
		const payload = body.payload as AppointmentBlockSchemaUpdate & {
			id: number;
		};
		const updated = await updateAppointmentBlock(event, {
			...payload,
			hospitalId
		});
		return json(updated);
	}
	if (mode === 'appointmentBlock.delete') {
		const id = Number(body.id ?? 0);
		await deleteAppointmentBlock(event, { hospitalId, id });
		return json({ ok: true });
	}
	if (mode === 'patientVisit.create') {
		const payload = body.payload as Record<string, unknown>;
		const created = await createPatientVisitInHospital(event, {
			...payload,
			hospitalId: String(hospitalId ?? '')
		} as PatientVisitCreateApiPayload);
		return json(created);
	}

	return json({ error: 'Unknown mode' }, { status: 400 });
};
