import { describe, expect, it } from 'vitest';
import { resolveNumericDomain } from '$lib/util/d3.util';

describe('resolveNumericDomain', () => {
	it('hugs the data instead of starting at zero', () => {
		const [min, max] = resolveNumericDomain([36.8]);
		expect(min).toBeGreaterThan(0);
		expect(min).toBeLessThan(36.8);
		expect(max).toBeGreaterThan(36.8);
	});

	it('pads a single reading so the domain is never degenerate', () => {
		const [min, max] = resolveNumericDomain([37]);
		expect(max - min).toBeGreaterThan(0);
	});

	it('widens to include a reference band', () => {
		const [min, max] = resolveNumericDomain([36.8], {
			include: { min: 36.2, max: 37.2 }
		});
		expect(min).toBeLessThan(36.2);
		expect(max).toBeGreaterThan(37.2);
	});

	it('extends down to zero when asked', () => {
		const [min] = resolveNumericDomain([120, 80], {
			includeZero: true
		});
		expect(min).toBeLessThanOrEqual(0);
	});

	it('handles an empty series with a usable unit domain', () => {
		expect(resolveNumericDomain([])).toEqual([0, 1]);
	});

	it('ignores non-finite values', () => {
		const [min, max] = resolveNumericDomain([
			Number.NaN,
			50,
			Infinity
		]);
		expect(Number.isFinite(min)).toBe(true);
		expect(Number.isFinite(max)).toBe(true);
		expect(min).toBeLessThan(50);
		expect(max).toBeGreaterThan(50);
	});
});
