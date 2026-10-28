import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientVisitSchema,
	PatientVisitSchemaInsert
} from '$lib/server/db/schema-type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { assertPatientCanOpenNewVisit } from '$lib/server/medora/patient-visit/assert-patient-can-open-new-visit.server';
import { and, eq, sql } from 'drizzle-orm';

/** Database or transaction executor (tx is cast to this shape by callers). */
type VisitDb = ReturnType<typeof ensureDb>;

async function getVisitStatusTaggingIds(
	db: VisitDb = ensureDb()
): Promise<{
	openId: number | null;
	vitalId: number | null;
	seenId: number | null;
	closedDischargedId: number | null;
}> {
	const rows = await db
		.select({
			id: table.statusTaggingTable.id,
			code: table.statusTaggingTable.code
		})
		.from(table.statusTaggingTable)
		.leftJoin(
			table.statusTaggingTypeTable,
			eq(
				table.statusTaggingTable.statusTaggingTypeId,
				table.statusTaggingTypeTable.id
			)
		)
		.where(sql`${table.statusTaggingTypeTable.name} ILIKE 'Visit'`);

	const byCode = new Map<string, number>();
	for (const r of rows) {
		if (r.code && r.id != null) byCode.set(String(r.code), r.id);
	}
	return {
		openId: byCode.get('open') ?? null,
		vitalId: byCode.get('vital') ?? null,
		seenId: byCode.get('seen') ?? null,
		closedDischargedId:
			byCode.get('closed_discharged') ??
			byCode.get('closed') ??
			byCode.get('discharged') ??
			null
	};
}

async function getNextVisitNo(
	params: {
		hospitalId: string;
		branchId: string;
		visitTypeId: number;
	},
	db: VisitDb = ensureDb()
): Promise<string> {
	const { hospitalId, branchId, visitTypeId } = params;
	const [hospital, branch, visitType] = await Promise.all([
		db.query.hospitalTable.findFirst({
			where: (t, { eq }) => eq(t.id, hospitalId)
		}),
		db.query.hospitalBranchTable.findFirst({
			where: (t, { eq }) => eq(t.id, branchId)
		}),
		db.query.visitTypeTable.findFirst({
			where: (t, { eq }) => eq(t.id, visitTypeId)
		})
	]);

	if (!hospital)
		throw error(
			400,
			'Hospital is required to generate visit number.'
		);
	if (!branch)
		throw error(400, 'Branch is required to generate visit number.');
	if (!visitType)
		throw error(
			400,
			'Visit type is required to generate visit number.'
		);

	const today = new Date();

	const [financialYear] = await db
		.select({
			id: table.financialYearTable.id,
			startDate: table.financialYearTable.startDate,
			endDate: table.financialYearTable.endDate
		})
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`
			)
		)
		.limit(1);

	if (!financialYear) {
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}

	return generatePrefix({
		hospitalId,
		branchId,
		financialYearId: financialYear.id,
		prefixKey: PREFIX_PURPOSE_STORAGE.VISIT_NO,
		context: { visitTypeId }
	});
}

type PatientVisitCreatePayload = Omit<
	PatientVisitSchemaInsert,
	'branchId' | 'visitNo'
> & {
	branchId?: string | null;
	hospitalId: string;
	/** ADT OPD→IPD: allow this unfinished OPD visit + its open OP bill */
	convertFromOpdVisitId?: string;
};

/**
 * Inserts a patient visit. Pass `db` to run inside a caller's transaction so
 * admission/bed changes and the visit commit (or roll back) together.
 */
export async function createPatientVisitRecord(
	payload: PatientVisitCreatePayload,
	db: VisitDb = ensureDb()
): Promise<PatientVisitSchema> {
	const branchId = payload.branchId ?? null;
	if (!branchId) {
		throw error(400, 'Branch is required to create patient visit');
	}
	if (!payload.hospitalId) {
		throw error(400, 'Hospital is required to create patient visit');
	}
	if (!payload.visitTypeId) {
		throw error(
			400,
			'Visit type is required to create patient visit'
		);
	}
	if (!payload.patientId) {
		throw error(400, 'Patient is required to create patient visit');
	}

	const { convertFromOpdVisitId, ...insertPayload } = payload;

	await assertPatientCanOpenNewVisit(
		{
			hospitalId: payload.hospitalId,
			patientId: payload.patientId,
			convertFromOpdVisitId
		},
		db
	);

	const visitNo = await getNextVisitNo(
		{
			hospitalId: payload.hospitalId,
			branchId,
			visitTypeId: payload.visitTypeId
		},
		db
	);

	const visitStatusTagging = await getVisitStatusTaggingIds(db);
	const statusTaggingId =
		payload.statusTaggingId ?? visitStatusTagging.openId;

	const values: PatientVisitSchemaInsert = {
		...insertPayload,
		branchId,
		visitNo,
		statusTaggingId
	};

	const [row] = await db
		.insert(table.patientVisitTable)
		.values(values)
		.returning();

	if (!row) throw error(400, 'Insert failed');
	return row;
}

export async function createPatientVisitInHospital(
	event: RequestEvent,
	payload: PatientVisitCreatePayload
): Promise<PatientVisitSchema> {
	await ensureCanAccessHospital(event, payload.hospitalId);
	return createPatientVisitRecord(payload);
}
