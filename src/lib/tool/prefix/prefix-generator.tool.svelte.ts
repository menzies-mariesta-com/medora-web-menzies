import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import {
	buildPrefixCounterScopeKey,
	defaultCounterScopeForPrefixKey,
	type PrefixCounterScopeFlags
} from '$lib/tool/prefix/prefix-counter-scope.util';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { YesNoEnum } from '$lib/model/enum/db-link';

export type PrefixFieldPath =
	| 'visit_type.code'
	| 'financial_year.code'
	| 'hospital.code'
	| 'branch.code';

/** Legacy `prefix_configuration.last_no` still accepted when reading stored formats. */
export type PrefixSequenceSource =
	| 'prefix_counter.last_no'
	| 'prefix_configuration.last_no';

export type PrefixFormatPart =
	| { type: 'literal'; value: string }
	| { type: 'field'; path: PrefixFieldPath }
	| {
			type: 'sequence';
			source: PrefixSequenceSource;
			op: 'inc';
			padStart?: number;
	  };

export interface PrefixFormatSpec {
	parts: PrefixFormatPart[];
}

export interface GeneratePrefixContext {
	visitTypeId?: number;
}

export interface GeneratePrefixParams {
	hospitalId: string;
	branchId?: string | null;
	financialYearId?: number | null;
	prefixKey: string;
	context?: GeneratePrefixContext;
}

/** Used when no `prefix_format` row exists yet (in-memory default only). */
function defaultFormatSpecForKey(prefixKey: string): PrefixFormatSpec {
	if (prefixKey === PREFIX_PURPOSE_STORAGE.VISIT_NO) {
		return {
			parts: [
				{ type: 'field', path: 'financial_year.code' },
				{ type: 'field', path: 'hospital.code' },
				{ type: 'field', path: 'branch.code' },
				{ type: 'field', path: 'visit_type.code' },
				{
					type: 'sequence',
					source: 'prefix_counter.last_no',
					op: 'inc',
					padStart: 6
				}
			]
		};
	}
	return {
		parts: [
			{ type: 'field', path: 'financial_year.code' },
			{ type: 'field', path: 'hospital.code' },
			{
				type: 'sequence',
				source: 'prefix_counter.last_no',
				op: 'inc',
				padStart: 6
			}
		]
	};
}

async function loadFormatAndScopeFromDb(
	hospitalId: string,
	prefixKey: string
): Promise<{
	formatSpec: PrefixFormatSpec;
	scope: PrefixCounterScopeFlags;
}> {
	const db = ensureDb();
	const [row] = await db
		.select({
			format: table.prefixFormatTable.format,
			counterIncludeBranch: table.prefixFormatTable.counterIncludeBranch,
			counterIncludeFinancialYear:
				table.prefixFormatTable.counterIncludeFinancialYear,
			counterIncludeVisitType: table.prefixFormatTable.counterIncludeVisitType
		})
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, hospitalId),
				eq(table.prefixFormatTable.key, prefixKey),
				isNull(table.prefixFormatTable.deletedAt)
			)
		)
		.limit(1);
	if (!row?.format) {
		return {
			formatSpec: defaultFormatSpecForKey(prefixKey),
			scope: defaultCounterScopeForPrefixKey(prefixKey)
		};
	}
	const scope: PrefixCounterScopeFlags = {
		includeBranch: row.counterIncludeBranch === YesNoEnum.YES,
		includeFinancialYear:
			row.counterIncludeFinancialYear === YesNoEnum.YES,
		includeVisitType: row.counterIncludeVisitType === YesNoEnum.YES
	};
	return {
		formatSpec: row.format as PrefixFormatSpec,
		scope
	};
}

async function resolveField(
	path: PrefixFieldPath,
	params: {
		hospitalId: string;
		branchId?: string | null;
		financialYearId?: number | null;
		visitTypeId?: number;
	}
): Promise<string> {
	const db = ensureDb();
	switch (path) {
		case 'hospital.code': {
			const [h] = await db
				.select({ code: table.hospitalTable.code })
				.from(table.hospitalTable)
				.where(eq(table.hospitalTable.id, params.hospitalId));
			return (h?.code ?? params.hospitalId).toString().toUpperCase();
		}
		case 'branch.code': {
			if (!params.branchId) return '';
			const [b] = await db
				.select({ code: table.hospitalBranchTable.code })
				.from(table.hospitalBranchTable)
				.where(eq(table.hospitalBranchTable.id, params.branchId));
			return (b?.code ?? '').toString().toUpperCase();
		}
		case 'visit_type.code': {
			if (!params.visitTypeId) return '';
			const [v] = await db
				.select({ code: table.visitTypeTable.code })
				.from(table.visitTypeTable)
				.where(eq(table.visitTypeTable.id, params.visitTypeId));
			return (v?.code ?? 'V').toString().toUpperCase();
		}
		case 'financial_year.code': {
			if (params.financialYearId == null) return '';
			const [fy] = await db
				.select({ code: table.financialYearTable.code })
				.from(table.financialYearTable)
				.where(
					eq(
						table.financialYearTable.id,
						params.financialYearId
					)
				);
			return (fy?.code ?? '').toString().toUpperCase();
		}
	}
}

export async function generatePrefix(
	params: GeneratePrefixParams
): Promise<string> {
	const db = ensureDb();
	const visitTypeId = params.context?.visitTypeId ?? null;

	const { formatSpec, scope } = await loadFormatAndScopeFromDb(
		params.hospitalId,
		params.prefixKey
	);

	const scopeKey = buildPrefixCounterScopeKey({
		hospitalId: params.hospitalId,
		prefixKey: params.prefixKey,
		branchId: params.branchId ?? null,
		financialYearId: params.financialYearId ?? null,
		visitTypeId,
		scope
	});

	const branchIdStored = scope.includeBranch
		? (params.branchId ?? null)
		: null;
	const financialYearIdStored = scope.includeFinancialYear
		? (params.financialYearId ?? null)
		: null;
	const visitTypeIdStored = scope.includeVisitType ? visitTypeId : null;

	const counterTbl = table.prefixCounterTable;
	const [counterRow] = await db
		.insert(counterTbl)
		.values({
			hospitalId: params.hospitalId,
			branchId: branchIdStored,
			financialYearId: financialYearIdStored,
			visitTypeId: visitTypeIdStored,
			key: params.prefixKey,
			scopeKey,
			lastNo: 1
		})
		.onConflictDoUpdate({
			target: counterTbl.scopeKey,
			set: { lastNo: sql`${counterTbl.lastNo} + 1` }
		})
		.returning({
			lastNo: counterTbl.lastNo
		});

	if (!counterRow) {
		throw new Error('Failed to update prefix counter');
	}

	const seqValue = counterRow.lastNo;

	let result = '';
	for (const part of formatSpec.parts) {
		if (part.type === 'literal') {
			result += part.value;
		} else if (part.type === 'sequence') {
			let value = seqValue;
			if (part.op === 'inc') {
				value = seqValue;
			}
			let s = String(value);
			if (part.padStart && part.padStart > 0) {
				s = s.padStart(part.padStart, '0');
			}
			result += s;
		} else if (part.type === 'field') {
			const fieldValue = await resolveField(part.path, {
				hospitalId: params.hospitalId,
				branchId: params.branchId,
				financialYearId: params.financialYearId ?? null,
				visitTypeId: params.context?.visitTypeId
			});
			result += fieldValue;
		}
	}

	return result;
}
