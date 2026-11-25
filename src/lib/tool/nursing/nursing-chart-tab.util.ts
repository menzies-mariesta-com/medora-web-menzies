import { VisitTypeEnum } from '$lib/model/enum/db-link';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

/** Every visit type that charts in the nursing workbench. */
const ALL_VISIT_TYPES = [
	VisitTypeEnum.OPD,
	VisitTypeEnum.IPD,
	VisitTypeEnum.ED,
	VisitTypeEnum.DAY_CARE,
	VisitTypeEnum.PACKAGE
] as const;

/** Tab opened when nothing is selected, and the fallback when a tab is filtered out. */
export const NURSING_CHART_DEFAULT_TAB =
	'patient-visit-history-dashboard';

/**
 * Chart tab slug → visit types that may see it.
 * Slugs missing here stay visible, so a new DB page does not silently vanish.
 * Hospital boards (census / track board / trauma log) are not chart tabs: they
 * live in ADT / Emergency nav and need no visit.
 */
export const NURSING_CHART_TABS: Record<
	string,
	{ label: string; visitTypes: readonly VisitTypeEnum[] }
> = {
	[NURSING_CHART_DEFAULT_TAB]: {
		label: 'Dashboard',
		visitTypes: ALL_VISIT_TYPES
	},
	vital: { label: 'Vital', visitTypes: ALL_VISIT_TYPES },
	allergy: { label: 'Allergy', visitTypes: ALL_VISIT_TYPES },
	order: { label: 'Order', visitTypes: ALL_VISIT_TYPES },
	'nursing-complete': {
		label: 'Nursing Complete',
		visitTypes: ALL_VISIT_TYPES
	},
	'case-sheet': { label: 'Case Sheet', visitTypes: ALL_VISIT_TYPES },
	'clinical-document': {
		label: 'Clinical Document',
		visitTypes: ALL_VISIT_TYPES
	},
	'patient-attachment': {
		label: 'Patient Attachment',
		visitTypes: ALL_VISIT_TYPES
	},
	emar: {
		label: 'eMAR',
		visitTypes: [VisitTypeEnum.IPD, VisitTypeEnum.ED]
	},
	'care-plan': {
		label: 'Care plans',
		visitTypes: [VisitTypeEnum.IPD, VisitTypeEnum.ED]
	},
	triage: { label: 'Triage', visitTypes: [VisitTypeEnum.ED] },
	'mlc-documentation': {
		label: 'MLC documentation',
		visitTypes: [VisitTypeEnum.ED]
	}
};

const CHART_PREFIX = `${WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH}/`;

/** Logical `pageUrl` → chart tab slug (`/medora/home/nursing-workbench/vital` → `vital`). */
export function nursingChartTabSlug(
	pageUrl: string | null | undefined
): string {
	const normalized = (pageUrl ?? '').replace(/\/+$/, '');
	if (!normalized.startsWith(CHART_PREFIX)) return '';
	return normalized.slice(CHART_PREFIX.length).split('/')[0] ?? '';
}

/** Chart tabs that still work with no visit selected (queue / board views). */
const NO_VISIT_CHART_TABS = new Set(['triage']);

/** True when the chart tab reads visit data, so the shell needs a selected visit. */
export function isVisitChartTab(slug: string): boolean {
	return (
		slug !== '' &&
		slug in NURSING_CHART_TABS &&
		!NO_VISIT_CHART_TABS.has(slug)
	);
}

/**
 * Fail-open: an unmapped tab or an unknown visit type keeps the tab visible.
 * Hiding navigation is a convenience, not a boundary — pages gate themselves.
 */
export function isNursingChartTabVisible(
	slug: string,
	visitTypeId: number | null | undefined
): boolean {
	if (!slug) return true;
	const tab = NURSING_CHART_TABS[slug];
	if (!tab) return true;
	if (visitTypeId == null) return true;
	return tab.visitTypes.includes(visitTypeId as VisitTypeEnum);
}

/** Keep tabs relevant to the selected visit type, preserving incoming order. */
export function filterNursingChartTabs<
	T extends { pageUrl: string | null }
>(pages: T[], visitTypeId: number | null | undefined): T[] {
	return pages.filter((page) =>
		isNursingChartTabVisible(
			nursingChartTabSlug(page.pageUrl),
			visitTypeId
		)
	);
}
