import { describe, expect, it } from 'vitest';
import {
	hoursFromVolumeAndRate,
	mlPerHourFromVolumeAndHours,
	mlPerHourFromWeightDose
} from './infusion-rate.util';

describe('infusion-rate.util', () => {
	it('computes ml/hr from volume and hours', () => {
		expect(mlPerHourFromVolumeAndHours(1000, 10)).toBe(100);
	});

	it('computes hours from volume and rate', () => {
		expect(hoursFromVolumeAndRate(500, 50)).toBe(10);
	});

	it('computes weight-based ml/hr', () => {
		expect(
			mlPerHourFromWeightDose({
				doseMgKgMin: 0.1,
				weightKg: 70,
				concentrationMgPerMl: 2
			})
		).toBe(210);
	});
});
