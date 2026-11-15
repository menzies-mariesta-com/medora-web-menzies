import { describe, expect, it } from 'vitest';
import {
	DATE_OF_BIRTH_MAX_AGE_YEARS,
	assertDateOfBirthInRange,
	dateOfBirthMaxIso,
	dateOfBirthMinIso,
	isDateOfBirthInRange
} from './date-of-birth-range.util';
import { compareISODate, shiftISODate } from './wash-calendar-date.util';

describe('date-of-birth-range', () => {
	it('max is today and not before min', () => {
		const max = dateOfBirthMaxIso();
		const min = dateOfBirthMinIso();
		expect(compareISODate(max, min)).toBeGreaterThanOrEqual(0);
		expect(isDateOfBirthInRange(max)).toBe(true);
	});

	it('rejects future and too-old dates', () => {
		const max = dateOfBirthMaxIso();
		expect(isDateOfBirthInRange(shiftISODate(max, 1))).toBe(false);
		expect(isDateOfBirthInRange(shiftISODate(dateOfBirthMinIso(), -1))).toBe(
			false
		);
	});

	it('assert throws on out-of-range', () => {
		expect(() =>
			assertDateOfBirthInRange(shiftISODate(dateOfBirthMaxIso(), 2))
		).toThrow();
	});

	it('min is about max age years before today', () => {
		const min = dateOfBirthMinIso();
		const max = dateOfBirthMaxIso();
		const minDate = new Date(min + 'T12:00:00');
		const maxDate = new Date(max + 'T12:00:00');
		const years = maxDate.getFullYear() - minDate.getFullYear();
		expect(years).toBeGreaterThanOrEqual(DATE_OF_BIRTH_MAX_AGE_YEARS - 1);
		expect(years).toBeLessThanOrEqual(DATE_OF_BIRTH_MAX_AGE_YEARS);
	});
});
