/** Map Nursing IPD chart children to shared EMR screen slugs (APIs stay under /emr). */
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
 * Build a Nursing IPD chart URL (stays under `/nursing-workbench/ipd/…`).
 */
export function buildIpdNursingChartUrl(input: {
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
	qs.delete('visitType');
	qs.delete('hasActiveAdmission');
	qs.delete('visitStatus');
	qs.delete('ipdContext');
	const q = qs.toString();
	return `/medora/hospital/${input.hospitalId}/home/nursing-workbench/ipd/${child}${q ? `?${q}` : ''}`;
}

/** @deprecated Use {@link buildIpdNursingChartUrl}. */
export function buildIpdNursingEmrUrl(input: {
	hospitalId: string;
	emrChild: string;
	search?: string;
}): string {
	return buildIpdNursingChartUrl(input);
}

export function buildConsultationEmrUrl(input: {
	hospitalId: string;
	visitId: string;
}): string {
	return `/medora/hospital/${input.hospitalId}/home/consultation/emr?visitId=${encodeURIComponent(String(input.visitId))}`;
}
