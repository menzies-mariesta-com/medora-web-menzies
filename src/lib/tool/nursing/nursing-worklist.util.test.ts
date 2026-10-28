import { describe, expect, it } from 'vitest';
import { VisitTypeEnum } from '$lib/model/enum/db-link';
import {
	buildNursingChartUrl,
	nursingChartTypeForVisitType
} from '$lib/tool/nursing/nursing-worklist.util';

const VISIT_ID = '01900000-0000-7000-8000-000000000001';

describe('nursingChartTypeForVisitType', () => {
	it('routes IPD and ED visits to their own chart families', () => {
		expect(nursingChartTypeForVisitType(VisitTypeEnum.IPD)).toBe(
			'ipd'
		);
		expect(nursingChartTypeForVisitType(VisitTypeEnum.ED)).toBe('ed');
	});

	it('uses the OPD chart for OPD, day-care and package visits', () => {
		expect(nursingChartTypeForVisitType(VisitTypeEnum.OPD)).toBe(
			'opd'
		);
		expect(nursingChartTypeForVisitType(VisitTypeEnum.DAY_CARE)).toBe(
			'opd'
		);
		expect(nursingChartTypeForVisitType(VisitTypeEnum.PACKAGE)).toBe(
			'opd'
		);
		expect(nursingChartTypeForVisitType(null)).toBe('opd');
	});
});

describe('buildNursingChartUrl', () => {
	it('builds the visit-type chart route with the visit id', () => {
		expect(
			buildNursingChartUrl({
				hospitalId: 'hospital-1',
				visitTypeId: VisitTypeEnum.IPD,
				visitId: VISIT_ID
			})
		).toBe(
			`/medora/hospital/hospital-1/home/nursing-workbench/ipd/vital?visitId=${VISIT_ID}`
		);
	});

	it('supports a custom chart tab', () => {
		expect(
			buildNursingChartUrl({
				hospitalId: 'hospital-1',
				visitTypeId: VisitTypeEnum.ED,
				visitId: VISIT_ID,
				child: 'triage'
			})
		).toBe(
			`/medora/hospital/hospital-1/home/nursing-workbench/ed/triage?visitId=${VISIT_ID}`
		);
	});
});
