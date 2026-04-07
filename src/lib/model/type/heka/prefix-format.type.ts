/**
 * Prefix template / generator (UI + server). No `$lib/server/**` imports.
 */

export type PrefixFieldPath =
	| 'visit_type.code'
	| 'financial_year.code'
	| 'hospital.code'
	| 'branch.code'
	/** Calendar year (YY) from order date `YYYY-MM-DD` — same as legacy `dateStr.slice(2, 4)`. */
	| 'order_date.year_2digit'
	/** `visit_no` if set, else visit id (legacy service order middle segment). */
	| 'visit.order_key';

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
	/** Service order: `YYYY-MM-DD` for {@link PrefixFieldPath} `order_date.year_2digit`. */
	orderDate?: string;
	/** Service order: splits counter per visit (legacy behaviour). */
	visitId?: number;
	visitNo?: string | null;
}

export interface GeneratePrefixParams {
	hospitalId: string;
	branchId?: string | null;
	financialYearId?: number | null;
	prefixKey: string;
	context?: GeneratePrefixContext;
}
