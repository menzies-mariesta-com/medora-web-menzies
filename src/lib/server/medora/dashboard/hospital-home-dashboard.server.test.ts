import { describe, expect, it } from 'vitest';
import {
	defaultHospitalHomeDateRange,
	parseHospitalHomeDateRange
} from './hospital-home-dashboard.server';

describe('parseHospitalHomeDateRange bounds', () => {
	const bounds = { min: '2024-06-01', max: '2024-06-30' };

	it('clamps future end to max', () => {
		const f = parseHospitalHomeDateRange({
			dates: '2024-06-01/2099-12-31',
			bounds
		});
		expect(f.dateTo).toBe('2024-06-30');
		expect(f.dateFrom).toBe('2024-06-01');
	});

	it('clamps start before hospital create', () => {
		const f = parseHospitalHomeDateRange({
			dates: '2020-01-01/2024-06-15',
			bounds
		});
		expect(f.dateFrom).toBe('2024-06-01');
		expect(f.dateTo).toBe('2024-06-15');
	});

	it('default window respects bounds', () => {
		const { dateFrom, dateTo } = defaultHospitalHomeDateRange(bounds);
		expect(dateFrom >= bounds.min).toBe(true);
		expect(dateTo <= bounds.max).toBe(true);
	});
});