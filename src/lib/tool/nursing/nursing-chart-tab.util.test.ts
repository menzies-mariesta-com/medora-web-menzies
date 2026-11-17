import { describe, expect, it } from 'vitest';
import { VisitTypeEnum } from '$lib/model/enum/db-link';
import {
	filterNursingChartTabs,
	isNursingChartTabVisible,
	NURSING_CHART_DEFAULT_TAB,
	nursingChartTabSlug
} from '$lib/tool/nursing/nursing-chart-tab.util';

const chartUrl = (slug: string) =>
	`/medora/home/nursing-workbench/${slug}`;

describe('nursingChartTabSlug', () => {
	it('reads the first segment after the nursing root', () => {
		expect(nursingChartTabSlug(chartUrl('vital'))).toBe('vital');
		expect(nursingChartTabSlug(`${chartUrl('vital')}/`)).toBe(
			'vital'
		);
	});

	it('returns empty for paths outside the chart root', () => {
		expect(
			nursingChartTabSlug('/medora/home/nursing-workbench')
		).toBe('');
		expect(nursingChartTabSlug('/medora/home/consultation/emr')).toBe(
			''
		);
		expect(nursingChartTabSlug(null)).toBe('');
	});
});

describe('isNursingChartTabVisible', () => {
	it('hides ED-only tabs for an OPD visit', () => {
		expect(
			isNursingChartTabVisible('triage', VisitTypeEnum.OPD)
		).toBe(false);
		expect(
			isNursingChartTabVisible('mlc-documentation', VisitTypeEnum.OPD)
		).toBe(false);
		expect(isNursingChartTabVisible('emar', VisitTypeEnum.OPD)).toBe(
			false
		);
		expect(
			isNursingChartTabVisible('care-plan', VisitTypeEnum.OPD)
		).toBe(false);
	});

	it('shows ED tabs for an ED visit and IPD tabs for IPD', () => {
		expect(isNursingChartTabVisible('triage', VisitTypeEnum.ED)).toBe(
			true
		);
		expect(isNursingChartTabVisible('vital', VisitTypeEnum.ED)).toBe(
			true
		);
		expect(isNursingChartTabVisible('emar', VisitTypeEnum.IPD)).toBe(
			true
		);
		expect(
			isNursingChartTabVisible('care-plan', VisitTypeEnum.IPD)
		).toBe(true);
	});

	it('keeps every chart tab for day care and package visits', () => {
		for (const slug of ['vital', 'allergy', 'order', 'case-sheet']) {
			expect(
				isNursingChartTabVisible(slug, VisitTypeEnum.DAY_CARE)
			).toBe(true);
			expect(
				isNursingChartTabVisible(slug, VisitTypeEnum.PACKAGE)
			).toBe(true);
		}
	});

	it('fails open while the visit type is unknown or the slug is unmapped', () => {
		expect(isNursingChartTabVisible('triage', null)).toBe(true);
		expect(isNursingChartTabVisible('triage', undefined)).toBe(true);
		expect(
			isNursingChartTabVisible('brand-new-tab', VisitTypeEnum.OPD)
		).toBe(true);
		expect(isNursingChartTabVisible('', VisitTypeEnum.OPD)).toBe(
			true
		);
	});

	it('never hides the dashboard tab', () => {
		for (const type of Object.values(VisitTypeEnum).filter(
			(v): v is VisitTypeEnum => typeof v === 'number'
		)) {
			expect(
				isNursingChartTabVisible(NURSING_CHART_DEFAULT_TAB, type)
			).toBe(true);
		}
	});
});

describe('filterNursingChartTabs', () => {
	const pages = [
		{ pageUrl: chartUrl('patient-visit-history-dashboard') },
		{ pageUrl: chartUrl('vital') },
		{ pageUrl: chartUrl('triage') },
		{ pageUrl: chartUrl('emar') },
		{ pageUrl: null }
	];

	it('drops ED-only tabs for an OPD visit', () => {
		const slugs = filterNursingChartTabs(
			pages,
			VisitTypeEnum.OPD
		).map((p) => nursingChartTabSlug(p.pageUrl));
		expect(slugs).toEqual([
			'patient-visit-history-dashboard',
			'vital',
			''
		]);
	});

	it('keeps ED-only tabs for an ED visit', () => {
		const slugs = filterNursingChartTabs(pages, VisitTypeEnum.ED).map(
			(p) => nursingChartTabSlug(p.pageUrl)
		);
		expect(slugs).toContain('triage');
		expect(slugs).toContain('emar');
		expect(slugs).toContain('vital');
	});

	it('keeps IPD-only chart tabs for an IPD visit and drops triage', () => {
		const slugs = filterNursingChartTabs(
			pages,
			VisitTypeEnum.IPD
		).map((p) => nursingChartTabSlug(p.pageUrl));
		expect(slugs).toContain('emar');
		expect(slugs).not.toContain('triage');
	});

	it('returns every tab when the visit type is unknown', () => {
		expect(filterNursingChartTabs(pages, null)).toHaveLength(
			pages.length
		);
	});
});
