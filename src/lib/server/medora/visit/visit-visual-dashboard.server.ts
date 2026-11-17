import type { RequestEvent } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getPatientVitalsByPatientIdPaginated,
	getVisitBasicsForVital
} from '$lib/server/medora/emr/patient-vital.server';
import type { PatientDiagnosisSchema } from '$lib/server/db/schema-type';
import type {
	VisitVisualPayload,
	VisitVisualVitalRow
} from '$lib/model/type/visit-dashboard.type';

/** Trend points are drawn, not paginated; the table is paged separately. */
const SERIES_LIMIT = 500;

function toVisualRow(
	row: PatientDiagnosisSchema & { visit?: { visitNo: string | null } | null }
): VisitVisualVitalRow {
	return {
		id: row.id,
		visitId: row.visitId,
		visitNo: row.visit?.visitNo ?? null,
		recordedAt: row.vitalDateTime ?? row.createdAt ?? null,
		weight: row.weight ?? null,
		bpSystolic: row.bpSystolic ?? null,
		bpDiastolic: row.bpDiastolic ?? null,
		pulse: row.pulse ?? null,
		temperature: row.temperature ?? null,
		respiration: row.respiration ?? null,
		spO2: row.spO2 ?? null,
		rbs: row.rbs ?? null
	};
}

/**
 * Patient-wide vitals for the Visual dashboard: trend series (oldest first,
 * capped) plus one server-paged table page (newest first). Active readings
 * only, matching the Vital tab's default filter.
 * shortcut: last 500 readings for charts, downsample server-side if a patient exceeds that.
 */
export async function getVisitVisualPayload(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: string;
		page: number;
		pageSize: number;
	}
): Promise<VisitVisualPayload> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const basics = await getVisitBasicsForVital(event, {
		hospitalId: input.hospitalId,
		visitId: input.visitId
	});
	if (!basics) {
		return {
			patientId: '',
			series: [],
			table: {
				rows: [],
				total: 0,
				page: 1,
				pageSize: input.pageSize
			}
		};
	}

	const v = table.patientDiagnosisTable;
	const [seriesRows, tablePage] = await Promise.all([
		ensureDb()
			.select({ vital: v, visitNo: table.patientVisitTable.visitNo })
			.from(v)
			.innerJoin(
				table.patientVisitTable,
				eq(table.patientVisitTable.id, v.visitId)
			)
			.where(
				and(
					eq(v.hospitalId, input.hospitalId),
					eq(v.patientId, basics.patientId),
					eq(v.statusId, StatusEnum.ACTIVE)
				)
			)
			.orderBy(desc(v.vitalDateTime), desc(v.createdAt), desc(v.id))
			.limit(SERIES_LIMIT),
		getPatientVitalsByPatientIdPaginated(event, {
			hospitalId: input.hospitalId,
			patientId: basics.patientId,
			statusId: StatusEnum.ACTIVE,
			page: input.page,
			pageSize: input.pageSize
		})
	]);

	return {
		patientId: basics.patientId,
		// Query is newest-first for the cap; charts read oldest-first.
		series: seriesRows
			.map((r) => toVisualRow({ ...r.vital, visit: { visitNo: r.visitNo } }))
			.reverse(),
		table: {
			rows: tablePage.data.map((r) => toVisualRow(r)),
			total: tablePage.total,
			page: tablePage.page,
			pageSize: tablePage.pageSize
		}
	};
}
