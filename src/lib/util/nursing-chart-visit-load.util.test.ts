import { describe, expect, it } from 'vitest';
import {
	isSupersededVisitFetch,
	shouldCommitNursingChartVisitLoad
} from './nursing-chart-visit-load.util';

describe('nursing-chart-visit-load.util', () => {
	it('treats AbortError and cancelled as superseded', () => {
		expect(
			isSupersededVisitFetch(new DOMException('aborted', 'AbortError'))
		).toBe(true);
		expect(isSupersededVisitFetch(new Error('x'), () => true)).toBe(true);
		expect(isSupersededVisitFetch(new Error('x'), () => false)).toBe(
			false
		);
	});

	it('commits load guard only for ok or not_found', () => {
		expect(shouldCommitNursingChartVisitLoad('ok')).toBe(true);
		expect(shouldCommitNursingChartVisitLoad('not_found')).toBe(true);
		expect(shouldCommitNursingChartVisitLoad('aborted')).toBe(false);
		expect(shouldCommitNursingChartVisitLoad('error')).toBe(false);
	});
});