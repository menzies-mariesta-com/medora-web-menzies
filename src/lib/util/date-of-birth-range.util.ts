import {
	compareISODate,
	parseISODate,
	toISODate
} from '$lib/util/wash-calendar-date.util';

export const DATE_OF_BIRTH_MAX_AGE_YEARS = 120;

/** Latest allowed DOB (local calendar today). */
export function dateOfBirthMaxIso(): string {
	return toISODate(new Date());
}

/** Earliest allowed DOB (~max age years before today, local calendar). */
export function dateOfBirthMinIso(
	maxAgeYears = DATE_OF_BIRTH_MAX_AGE_YEARS
): string {
	const today = parseISODate(dateOfBirthMaxIso());
	if (!today) return dateOfBirthMaxIso();
	const earliest = new Date(today.getTime());
	earliest.setFullYear(earliest.getFullYear() - maxAgeYears);
	return toISODate(earliest);
}

export function isDateOfBirthInRange(iso: string): boolean {
	const day = iso.trim().slice(0, 10);
	if (!parseISODate(day)) return false;
	return (
		compareISODate(day, dateOfBirthMinIso()) >= 0 &&
		compareISODate(day, dateOfBirthMaxIso()) <= 0
	);
}

export class DateOfBirthRangeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DateOfBirthRangeError';
	}
}

/** Throws when `iso` is not a valid in-range date of birth. */
export function assertDateOfBirthInRange(iso: string): void {
	const day = iso.trim().slice(0, 10);
	if (!parseISODate(day)) {
		throw new DateOfBirthRangeError('Invalid date of birth');
	}
	if (compareISODate(day, dateOfBirthMaxIso()) > 0) {
		throw new DateOfBirthRangeError('Date of birth cannot be in the future');
	}
	if (compareISODate(day, dateOfBirthMinIso()) < 0) {
		throw new DateOfBirthRangeError(
			`Date of birth must be within the last ${DATE_OF_BIRTH_MAX_AGE_YEARS} years`
		);
	}
}
