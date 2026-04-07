import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	getDoctorByIdWithRelations,
	getDoctorStaffPaginated,
	listDoctorSchedules,
	listDoctorStaff
} from '$lib/server/heka/appointment/appointment.server';
import {
	createDoctorSchedule,
	updateDoctorSchedule
} from '$lib/server/heka/appointment/doctor-schedule.server';

type Mode =
	| 'weekday.list'
	| 'doctor.paginated'
	| 'doctor.byId'
	| 'doctor.list'
	| 'doctorSchedule.list'
	| 'doctorSchedule.create'
	| 'doctorSchedule.update';

function modeFromUrl(event: Parameters<RequestHandler>[0]): Mode {
	return (event.url.searchParams.get('mode') ?? '') as Mode;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = modeFromUrl(event);

	if (mode === 'weekday.list') {
		const data = await ensureDb()
			.select()
			.from(table.weekdayTable)
			.where(ne(table.weekdayTable.statusId, StatusEnum.DELETED))
			.orderBy(table.weekdayTable.id);
		return json(data);
	}

	if (mode === 'doctor.byId') {
		const id = event.url.searchParams.get('id') ?? '';
		const data = await getDoctorByIdWithRelations(event, { hospitalId, id });
		return json(data);
	}

	if (mode === 'doctor.paginated') {
		const page = Number(event.url.searchParams.get('page') ?? '1');
		const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
		const search = event.url.searchParams.get('search') ?? undefined;
		const branchId = event.url.searchParams.get('branchId') ?? undefined;
		const data = await getDoctorStaffPaginated(event, {
			hospitalId,
			page,
			pageSize,
			search,
			branchId
		} as any);
		return json(data);
	}

	if (mode === 'doctor.list') {
		const branchId = event.url.searchParams.get('branchId') ?? undefined;
		const data = await listDoctorStaff(event, { hospitalId, branchId });
		return json(data);
	}

	if (mode === 'doctorSchedule.list') {
		const branchId = event.url.searchParams.get('branchId') ?? undefined;
		const data = await listDoctorSchedules(event, { hospitalId, branchId });
		return json(data);
	}

	return json({ error: 'Unknown mode' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as {
		mode?: Mode;
		[k: string]: unknown;
	};
	const mode = body.mode as Mode;

	if (mode === 'doctorSchedule.create') {
		const payload = body.payload as any;
		const created = await createDoctorSchedule(event, {
			...payload,
			hospitalId
		});
		return json(created);
	}

	if (mode === 'doctorSchedule.update') {
		const payload = body.payload as any;
		const updated = await updateDoctorSchedule(event, payload);
		return json(updated);
	}

	return json({ error: 'Unknown mode' }, { status: 400 });
};

