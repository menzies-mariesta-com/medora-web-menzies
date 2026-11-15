import { error } from '@sveltejs/kit';
import {
	assertDateOfBirthInRange,
	DateOfBirthRangeError
} from '$lib/util/date-of-birth-range.util';

/** Normalize optional DOB for DB; throws HTTP 400 when out of range. */
export function requireOptionalDateOfBirth(
	raw?: string | null
): string | undefined {
	if (!raw?.trim()) return undefined;
	const day = raw.trim().slice(0, 10);
	try {
		assertDateOfBirthInRange(day);
		return day;
	} catch (e) {
		const message =
			e instanceof DateOfBirthRangeError
				? e.message
				: 'Invalid date of birth';
		throw error(400, message);
	}
}
