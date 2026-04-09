import { error, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import type {
	ServiceOrderDetailRowForVisit,
	VisitDashboardPayload
} from '$lib/model/type/visit-dashboard.type';

export async function getVisitDashboardPayload(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number }
): Promise<VisitDashboardPayload> {
	await ensureCanAccessHospital(event, input.hospitalId);

	if (!Number.isFinite(input.visitId) || input.visitId <= 0) {
		throw error(400, 'visitId is required');
	}

	const selectedVisit = (await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.id, input.visitId),
				eq(t.hospitalId, input.hospitalId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		with: {
			patient: { with: { title: true, gender: true } },
			status: true,
			visitType: true,
			hospital: true,
			branch: true,
			doctor: { with: { title: true, specialization: true, staffDetail: true } },
			appointment: true,
			diagnoses: true,
			patientDocuments: true
		}
	})) as VisitDashboardPayload['selectedVisit'] | null;

	if (!selectedVisit) {
		return { selectedVisit: null, patientVisits: [], orderLines: [] };
	}

	const patientId = selectedVisit.patientId ?? null;
	if (!patientId) {
		return { selectedVisit, patientVisits: [], orderLines: [] };
	}

	const patientVisits = (await ensureDb().query.patientVisitTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.patientId, patientId),
				eq(t.hospitalId, input.hospitalId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		with: {
			patient: { with: { title: true, gender: true } },
			status: true,
			visitType: true,
			hospital: true,
			branch: true,
			doctor: { with: { title: true, specialization: true, staffDetail: true } },
			appointment: true,
			diagnoses: true,
			patientDocuments: true
		},
		orderBy: (t) => desc(t.createdAt)
	})) as VisitDashboardPayload['patientVisits'];

	const orderLines = await getOrderLinesForVisit(input.visitId);

	return { selectedVisit, patientVisits, orderLines };
}

async function getOrderLinesForVisit(
	visitId: number
): Promise<ServiceOrderDetailRowForVisit[]> {
	const orders = await ensureDb().query.serviceOrderTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(eq(t.visitId, visitId), ne(t.statusId, StatusEnum.DELETED)),
		columns: { id: true, orderNo: true },
		with: {
			details: {
				where: (d, { ne }) => ne(d.statusId, StatusEnum.DELETED),
				with: { serviceItem: true }
			}
		}
	});

	const out: ServiceOrderDetailRowForVisit[] = [];
	for (const ord of orders) {
		for (const d of ord.details) {
			out.push({
				id: d.id,
				serviceId: d.serviceId ?? null,
				serviceName: d.serviceItem?.serviceName ?? null,
				serviceAmount: (d as any).serviceAmount ?? null,
				serviceUnit: (d as any).serviceUnit ?? null,
				instruction: (d as any).instruction ?? null,
				createdAt: (d as any).createdAt ?? null
			});
		}
	}
	out.sort((a, b) => b.id - a.id);
	return out;
}

