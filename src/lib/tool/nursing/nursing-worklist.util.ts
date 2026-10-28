import { VisitTypeEnum } from '$lib/model/enum/db-link';

/** Nursing chart family; each maps to its own route prefix + tab set. */
export type NursingChartType = 'opd' | 'ipd' | 'ed';

const CHART_ROUTE_SEGMENT: Record<NursingChartType, string> = {
	opd: 'emr',
	ipd: 'ipd',
	ed: 'ed'
};

/**
 * Resolve the nursing chart family for a visit type.
 * Day-care and package visits use the OPD chart.
 */
export function nursingChartTypeForVisitType(
	visitTypeId: number | null | undefined
): NursingChartType {
	if (visitTypeId === VisitTypeEnum.IPD) return 'ipd';
	if (visitTypeId === VisitTypeEnum.ED) return 'ed';
	return 'opd';
}

/**
 * Build a nursing chart URL for a patient visit. The route prefix is chosen
 * from the visit type so the chart tabs match the patient's workflow.
 */
export function buildNursingChartUrl(input: {
	hospitalId: string;
	visitTypeId: number | null | undefined;
	visitId: string;
	/** Chart tab slug; defaults to the shared Vital tab. */
	child?: string;
}): string {
	const type = nursingChartTypeForVisitType(input.visitTypeId);
	const child = input.child ?? 'vital';
	const search = new URLSearchParams({ visitId: input.visitId });
	return `/medora/hospital/${input.hospitalId}/home/nursing-workbench/${CHART_ROUTE_SEGMENT[type]}/${child}?${search.toString()}`;
}
