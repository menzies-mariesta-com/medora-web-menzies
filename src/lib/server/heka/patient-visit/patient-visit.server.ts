import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientVisitSchema,
	PatientVisitSchemaInsert
} from '$lib/server/db/schema-type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { and, eq, sql } from 'drizzle-orm';

async function getVisitStatusTaggingIds(): Promise<{
	openId: number | null;
	vitalId: number | null;
	seenId: number | null;
	closedId: number | null;
}> {
	const rows = await ensureDb()
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
		closedId: byCode.get('closed') ?? null
	};
}

async function getNextVisitNo(params: {
	hospitalId: string;
	branchId: string;
	visitTypeId: number;
}): Promise<string> {
	const { hospitalId, branchId, visitTypeId } = params;
	const [hospital, branch, visitType] = await Promise.all([
		ensureDb().query.hospitalTable.findFirst({
			where: (t, { eq }) => eq(t.id, hospitalId)
		}),
		ensureDb().query.hospitalBranchTable.findFirst({
			where: (t, { eq }) => eq(t.id, branchId)
		}),
		ensureDb().query.visitTypeTable.findFirst({
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

	const db = ensureDb();
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

export async function createPatientVisitInHospital(
	event: RequestEvent,
	payload: Omit<PatientVisitSchemaInsert, 'branchId' | 'visitNo'> & {
		branchId?: string | null;
		hospitalId: string;
	}
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

	await ensureCanAccessHospital(event, payload.hospitalId);

	const visitNo = await getNextVisitNo({
		hospitalId: payload.hospitalId,
		branchId,
		visitTypeId: payload.visitTypeId
	});

	const visitStatusTagging = await getVisitStatusTaggingIds();
	const statusTaggingId =
		payload.statusTaggingId ?? visitStatusTagging.openId;

	const values: PatientVisitSchemaInsert = {
		...payload,
		branchId,
		visitNo,
		statusTaggingId
	};

	const [row] = await ensureDb()
		.insert(table.patientVisitTable)
		.values(values)
		.returning();

	if (!row) throw error(400, 'Insert failed');
	return row;
}
