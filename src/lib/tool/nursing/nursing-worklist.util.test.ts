import { describe, expect, it } from 'vitest';
import {
	buildNursingChartUrl,
	isNursingChartPath
} from '$lib/tool/nursing/nursing-worklist.util';

const VISIT_ID = '01900000-0000-7000-8000-000000000001';

describe('buildNursingChartUrl', () => {
	it('builds the shared chart route with the visit id', () => {
		expect(
			buildNursingChartUrl({
				hospitalId: 'hospital-1',
				visitId: VISIT_ID
			})
		).toBe(
			`/medora/hospital/hospital-1/home/nursing-workbench/vital?visitId=${VISIT_ID}`
		);
	});

	it('supports a custom chart tab', () => {
		expect(
			buildNursingChartUrl({
				hospitalId: 'hospital-1',
				visitId: VISIT_ID,
				child: 'triage'
			})
		).toBe(
			`/medora/hospital/hospital-1/home/nursing-workbench/triage?visitId=${VISIT_ID}`
		);
	});
});

describe('isNursingChartPath', () => {
	it('matches shared chart tabs', () => {
		expect(
			isNursingChartPath('/medora/home/nursing-workbench/census')
		).toBe(true);
		expect(
			isNursingChartPath('/medora/home/nursing-workbench/track-board')
		).toBe(true);
		expect(
			isNursingChartPath('/medora/home/nursing-workbench/emar')
		).toBe(true);
		expect(
			isNursingChartPath('/medora/home/nursing-workbench/care-plan')
		).toBe(true);
	});

	it('does not match the worklist or legacy redirect paths', () => {
		expect(isNursingChartPath('/medora/home/nursing-workbench')).toBe(
			false
		);
		expect(
			isNursingChartPath('/medora/home/nursing-workbench/emr/vital')
		).toBe(false);
	});
});
