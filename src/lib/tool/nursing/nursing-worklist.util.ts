import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

/** Sub-pages that share the single nursing page layout. */
const NURSING_CHART_SEGMENTS = new Set([
	'vital',
	'allergy',
	'patient-attachment',
	'clinical-document',
	'case-sheet',
	'order',
	'nursing-complete',
	'patient-visit-history-dashboard',
	'census',
	'track-board',
	'triage',
	'trauma-log',
	'emar',
	'care-plan'
]);

/**
 * Build a nursing chart URL. Every visit type uses the same chart page; the
 * visit type only changes which board tabs are relevant.
 */
export function buildNursingChartUrl(input: {
	hospitalId: string;
	visitId: string;
	/** Chart tab slug; defaults to the shared Vital tab. */
	child?: string;
}): string {
	const child = input.child ?? 'vital';
	const search = new URLSearchParams({ visitId: input.visitId });
	return `/medora/hospital/${input.hospitalId}/home/nursing-workbench/${child}?${search.toString()}`;
}

/** True when the logical page path is one of the shared nursing chart tabs. */
export function isNursingChartPath(path: string): boolean {
	const normalized = path.replace(/\/+$/, '');
	const prefix = `${WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH}/`;
	if (!normalized.startsWith(prefix)) return false;
	const segment = normalized.slice(prefix.length).split('/')[0] ?? '';
	return NURSING_CHART_SEGMENTS.has(segment);
}
