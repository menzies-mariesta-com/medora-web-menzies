import { VisitTypeEnum } from '$lib/model/enum/db-link';

/** Query flag so Nursing OPD screens keep IPD visit-picker defaults after redirect. */
export const IPD_CONTEXT_QUERY = 'ipdContext';

const IPD_CHILD_TO_EMR: Record<string, string> = {
	vital: 'vital',
	allergy: 'allergy',
	'patient-attachment': 'patient-attachment',
	'clinical-document': 'clinical-document',
	'case-sheet': 'case-sheet',
	order: 'order',
	'nursing-complete': 'nursing-complete'
};

/**
 * Build Nursing OPD EMR URL with IPD context preserved for visit picker filters.
 */
export function buildIpdNursingEmrUrl(input: {
	hospitalId: string;
	emrChild: string;
	search?: string;
}): string {
	const child = IPD_CHILD_TO_EMR[input.emrChild] ?? input.emrChild;
	const qs = new URLSearchParams(
		input.search?.startsWith('?')
			? input.search.slice(1)
			: (input.search ?? '')
	);
	qs.set(IPD_CONTEXT_QUERY, '1');
	qs.set('visitType', String(VisitTypeEnum.IPD));
	qs.set('visitStatus', 'admitted');
	const q = qs.toString();
	return `/medora/hospital/${input.hospitalId}/home/nursing-workbench/emr/${child}${q ? `?${q}` : ''}`;
}

export function buildConsultationEmrUrl(input: {
	hospitalId: string;
	visitId: number | string;
}): string {
	return `/medora/hospital/${input.hospitalId}/home/consultation/emr?visitId=${encodeURIComponent(String(input.visitId))}`;
}
