import { describe, expect, it } from 'vitest';
import { isValidColorInput, normalizeColorInput } from './validate-color.util';

describe('validate-color.util', () => {
	it('normalizes 3-digit hex', () => {
		expect(normalizeColorInput('#abc')).toBe('#aabbcc');
	});

	it('accepts rgba', () => {
		expect(isValidColorInput('rgba(10, 20, 30, 0.5)')).toBe(true);
	});

	it('rejects garbage', () => {
		expect(isValidColorInput('not-a-color')).toBe(false);
	});
});