import { error } from '@sveltejs/kit';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
import type { MlcCaseRow } from '$lib/model/type/medora/mlc-documentation.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import {
	getTemplateByCode,
	saveFormInstance
} from '$lib/server/medora/clinical-form/clinical-form.server';
import {
	canAmendMlcRecord,
	canMutateMlcRecord,
	canSignMlc
} from './mlc-documentation-rules.util';

export type MlcInstanceSummary = MlcCaseRow;

/** New template. v1 rows stay readable for records created before this change. */
export const MLC_TEMPLATE_CODE = 'ed_mlc_documentation_v2';
export const MLC_LEGACY_TEMPLATE_CODE = 'ed_mlc_documentation_v1';
export const MLC_CONTEXT_TYPE = 'mlc';

async function currentFinancialYearId(
	hospitalId: string
): Promise<number> {
	const [row] = await ensureDb()
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, hospitalId),
				sql`${table.financialYearTable.startDate} <= ${new Date().toISOString()}`,
				sql`${table.financialYearTable.endDate} >= ${new Date().toISOString()}`,
				isNull(table.financialYearTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) {
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}
	return row.id;
}

async function nextMlcFormNumber(input: {
	hospitalId: string;
	branchId: string;
}): Promise<string> {
	const financialYearId = await currentFinancialYearId(
		input.hospitalId
	);
	try {
		return await generatePrefix({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			financialYearId,
			prefixKey: PREFIX_PURPOSE_STORAGE.MLC_NO,
			context: {}
		});
	} catch (e) {
		const detail = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate MLC number (MLC_NO). Configure it in Prefix Configuration. (${detail})`
		);
	}
}

/** MLC records for a visit, newest first, with addenda nested under their parent. */
export async function listMlcCases(input: {
	hospitalId: string;
	visitId: string;
}): Promise<MlcInstanceSummary[]> {
	const rows = await ensureDb()
		.select({
			id: table.clinicalFormInstanceTable.id,
			formNumber: table.clinicalFormInstanceTable.formNumber,
			parentInstanceId:
				table.clinicalFormInstanceTable.parentInstanceId,
			statusTaggingId:
				table.clinicalFormInstanceTable.statusTaggingId,
			signedAt: table.clinicalFormInstanceTable.signedAt,
			signedBy: table.clinicalFormInstanceTable.signedBy,
			valuesJson: table.clinicalFormInstanceTable.valuesJson,
			createdAt: table.clinicalFormInstanceTable.createdAt,
			updatedAt: table.clinicalFormInstanceTable.updatedAt,
			templateCode: table.clinicalFormTemplateTable.code,
			schemaJson: table.clinicalFormTemplateTable.schemaJson
		})
		.from(table.clinicalFormInstanceTable)
		.innerJoin(
			table.clinicalFormTemplateTable,
			eq(
				table.clinicalFormInstanceTable.templateId,
				table.clinicalFormTemplateTable.id
			)
		)
		.where(
			and(
				eq(
					table.clinicalFormInstanceTable.hospitalId,
					input.hospitalId
				),
				eq(table.clinicalFormInstanceTable.visitId, input.visitId),
				eq(
					table.clinicalFormInstanceTable.contextType,
					MLC_CONTEXT_TYPE
				),
				eq(
					table.clinicalFormInstanceTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.orderBy(desc(table.clinicalFormInstanceTable.createdAt));

	return rows.map((row) => ({
		...row,
		schemaJson: (row.schemaJson ??
			null) as ClinicalFormTemplateSchema | null,
		valuesJson: (row.valuesJson ?? {}) as Record<string, unknown>
	}));
}

/** True when the encounter is flagged as an MLC case at ED registration. */
async function isMlcEncounter(input: {
	hospitalId: string;
	visitId: string;
}): Promise<boolean> {
	const [row] = await ensureDb()
		.select({ isMlc: table.edEncounterTable.isMlc })
		.from(table.edEncounterTable)
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	return Boolean(row?.isMlc);
}

async function staffDisplayName(
	staffId: string
): Promise<string | null> {
	const [row] = await ensureDb()
		.select({
			firstName: table.staffTable.firstName,
			middleName: table.staffTable.middleName,
			lastName: table.staffTable.lastName
		})
		.from(table.staffTable)
		.where(eq(table.staffTable.id, staffId))
		.limit(1);
	if (!row) return null;
	return (
		[row.firstName, row.middleName, row.lastName]
			.filter((part): part is string => Boolean(part?.trim()))
			.join(' ')
			.trim() || null
	);
}

export async function getMlcBootstrap(input: {
	hospitalId: string;
	visitId: string;
	staffId: string | null;
}) {
	const [template, cases, encounterIsMlc, staffName] =
		await Promise.all([
			getTemplateByCode({
				hospitalId: input.hospitalId,
				code: MLC_TEMPLATE_CODE
			}).catch(() => null),
			listMlcCases(input),
			isMlcEncounter(input),
			input.staffId ? staffDisplayName(input.staffId) : null
		]);

	return {
		templateCode: MLC_TEMPLATE_CODE,
		schemaJson: (template?.schemaJson ??
			null) as ClinicalFormTemplateSchema | null,
		cases,
		encounterIsMlc,
		staffName
	};
}

/**
 * A signed record is a legal artefact: it is never mutated. Corrections go
 * through {@link createMlcAddendum}.
 */
async function assertMlcMutable(input: {
	hospitalId: string;
	id: number;
}): Promise<void> {
	const [row] = await ensureDb()
		.select({
			statusTaggingId: table.clinicalFormInstanceTable.statusTaggingId
		})
		.from(table.clinicalFormInstanceTable)
		.where(
			and(
				eq(table.clinicalFormInstanceTable.id, input.id),
				eq(
					table.clinicalFormInstanceTable.hospitalId,
					input.hospitalId
				)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'MLC record not found');
	const rule = canMutateMlcRecord(row.statusTaggingId);
	if (!rule.ok) throw error(400, rule.message);
}

export async function saveMlcDraft(input: {
	hospitalId: string;
	visitId: string;
	valuesJson: Record<string, unknown>;
	staffId: string | null;
	/** Existing draft id, when resuming. */
	id?: number;
}) {
	if (input.id != null) {
		await assertMlcMutable({
			hospitalId: input.hospitalId,
			id: input.id
		});
		const row = await saveFormInstance({
			id: input.id,
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			templateCode: MLC_TEMPLATE_CODE,
			contextType: MLC_CONTEXT_TYPE,
			valuesJson: input.valuesJson,
			sign: false,
			draft: true,
			staffId: input.staffId
		});
		return row;
	}

	const branchId = await visitBranchId(input);
	const formNumber = await nextMlcFormNumber({
		hospitalId: input.hospitalId,
		branchId
	});
	return saveFormInstance({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		templateCode: MLC_TEMPLATE_CODE,
		contextType: MLC_CONTEXT_TYPE,
		valuesJson: input.valuesJson,
		formNumber,
		sign: false,
		draft: true,
		staffId: input.staffId
	});
}

export async function signMlc(input: {
	hospitalId: string;
	visitId: string;
	id?: number;
	valuesJson: Record<string, unknown>;
	staffId: string;
}) {
	const signRule = canSignMlc(input.valuesJson);
	if (!signRule.ok) throw error(400, signRule.message);
	if (input.id != null) {
		await assertMlcMutable({
			hospitalId: input.hospitalId,
			id: input.id
		});
	}
	const branchId = await visitBranchId(input);
	const formNumber =
		input.id != null
			? undefined
			: await nextMlcFormNumber({
					hospitalId: input.hospitalId,
					branchId
				});

	return saveFormInstance({
		...(input.id != null ? { id: input.id } : {}),
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		templateCode: MLC_TEMPLATE_CODE,
		contextType: MLC_CONTEXT_TYPE,
		valuesJson: input.valuesJson,
		...(formNumber ? { formNumber } : {}),
		sign: true,
		staffId: input.staffId
	});
}

export async function createMlcAddendum(input: {
	hospitalId: string;
	visitId: string;
	parentInstanceId: number;
	valuesJson: Record<string, unknown>;
	staffId: string;
}) {
	const parent =
		await ensureDb().query.clinicalFormInstanceTable.findFirst({
			where: (t, { and, eq }) =>
				and(
					eq(t.id, input.parentInstanceId),
					eq(t.hospitalId, input.hospitalId)
				)
		});
	if (!parent) throw error(404, 'MLC record not found');
	const amendRule = canAmendMlcRecord(parent.statusTaggingId);
	if (!amendRule.ok) throw error(400, amendRule.message);

	// Addenda carry no register number of their own: one MLC case has one number,
	// and `parentInstanceId` is what ties the correction to the original.
	return saveFormInstance({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		templateCode: MLC_TEMPLATE_CODE,
		contextType: MLC_CONTEXT_TYPE,
		valuesJson: input.valuesJson,
		parentInstanceId: parent.id,
		sign: true,
		staffId: input.staffId
	});
}

/** Branch for prefix scoping. Read inline so this module needs no extra helper. */
async function visitBranchId(input: {
	hospitalId: string;
	visitId: string;
}): Promise<string> {
	const [visit] = await ensureDb()
		.select({ branchId: table.patientVisitTable.branchId })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	return visit.branchId;
}
