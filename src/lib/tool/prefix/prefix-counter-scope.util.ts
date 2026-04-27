/**
 * Which optional dimensions are part of {@link prefixCounterTable.scopeKey}.
 * Stored on `prefix_format` and used by `generatePrefix`.
 */
export type PrefixCounterScopeFlags = {
	includeBranch: boolean;
	includeFinancialYear: boolean;
	includeVisitType: boolean;
	/** When true, append context `visitId` to scope key when the generator provides it. */
	includeVisit: boolean;
};

/** Defaults when no `prefix_format` row exists (matches built-in purposes). */
export function defaultCounterScopeForPrefixKey(
	prefixKey: string
): PrefixCounterScopeFlags {
	if (
		prefixKey === 'PURCHASE_REQUISITION_NO' ||
		prefixKey === 'PURCHASE_ORDER_NO'
	) {
		return {
			includeBranch: true,
			includeFinancialYear: true,
			includeVisitType: false,
			includeVisit: false
		};
	}
	if (prefixKey === 'VISIT_NO') {
		return {
			includeBranch: true,
			includeFinancialYear: true,
			includeVisitType: true,
			includeVisit: false
		};
	}
	if (prefixKey === 'ORDER_NO') {
		return {
			includeBranch: false,
			includeFinancialYear: false,
			includeVisitType: false,
			// Legacy: sequence 001, 002… per patient visit.
			includeVisit: true
		};
	}
	if (prefixKey === 'MEDICATION_ORDER_BATCH_NO') {
		return {
			includeBranch: false,
			includeFinancialYear: true,
			includeVisitType: false,
			includeVisit: false
		};
	}
	return {
		includeBranch: false,
		includeFinancialYear: true,
		includeVisitType: false,
		includeVisit: false
	};
}

export function defaultCounterScopeForStorageKey(
	storageKey:
		| 'PATIENT_CODE'
		| 'VISIT_NO'
		| 'ORDER_NO'
		| 'PURCHASE_REQUISITION_NO'
		| 'PURCHASE_ORDER_NO'
		| 'MEDICATION_ORDER_BATCH_NO'
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
	/**
	 * When {@link PrefixCounterScopeFlags.includeVisit} is true and this is set
	 * (e.g. service order creation passes visit id), scope key includes the visit.
	 */
	visitIdForScope?: number | null;
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
	const parts = [
		params.hospitalId,
		b,
		fy,
		params.prefixKey,
		vt
	];
	if (
		params.scope.includeVisit &&
		params.visitIdForScope != null &&
		Number.isFinite(params.visitIdForScope)
	) {
		parts.push(String(params.visitIdForScope));
	}
	return parts.join('|');
}
