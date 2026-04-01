/**
 * Which optional dimensions are part of {@link prefixCounterTable.scopeKey}.
 * Stored on `prefix_format` and used by `generatePrefix`.
 */
export type PrefixCounterScopeFlags = {
	includeBranch: boolean;
	includeFinancialYear: boolean;
	includeVisitType: boolean;
};

/** Defaults when no `prefix_format` row exists (matches built-in purposes). */
export function defaultCounterScopeForPrefixKey(
	prefixKey: string
): PrefixCounterScopeFlags {
	if (prefixKey === 'VISIT_NO') {
		return {
			includeBranch: true,
			includeFinancialYear: true,
			includeVisitType: true
		};
	}
	return {
		includeBranch: false,
		includeFinancialYear: true,
		includeVisitType: false
	};
}

export function defaultCounterScopeForStorageKey(
	storageKey: 'PATIENT_CODE' | 'VISIT_NO'
): PrefixCounterScopeFlags {
	return defaultCounterScopeForPrefixKey(storageKey);
}

/**
 * Stable key for {@link prefixCounterTable}; must stay aligned with SQL migrations
 * that rebuild `scope_key` from `prefix_format` flags.
 */
export function buildPrefixCounterScopeKey(params: {
	hospitalId: string;
	prefixKey: string;
	branchId: string | null;
	financialYearId: number | null;
	visitTypeId: number | null;
	scope: PrefixCounterScopeFlags;
}): string {
	const b = params.scope.includeBranch ? (params.branchId ?? '') : '';
	const fy = params.scope.includeFinancialYear
		? params.financialYearId == null
			? ''
			: String(params.financialYearId)
		: '';
	const vt = params.scope.includeVisitType
		? params.visitTypeId == null
			? ''
			: String(params.visitTypeId)
		: '';
	return [
		params.hospitalId,
		b,
		fy,
		params.prefixKey,
		vt
	].join('|');
}
