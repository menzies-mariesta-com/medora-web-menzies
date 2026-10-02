import { StatusEnum } from '$lib/model/enum/db-link';

/** Minimal postal row shape for client-side default selection. */
export type PostalCodePickRow = {
	id: number;
	cityId: number;
	statusId: number;
};

/**
 * Default postal code id for a city (product “township”).
 *
 * Rule:
 * 1. Only rows parented to `cityId` (lookup already excludes deleted).
 * 2. Prefer ACTIVE; if none, use remaining matches.
 * 3. Among candidates, pick the lowest `id` (stable single default when
 *    multiple postals share a city).
 *
 * Returns `''` when city is missing or no postal exists.
 */
export function pickPostalCodeIdForCity(
	postalCodes: PostalCodePickRow[],
	cityId: number | null | undefined
): string {
	if (cityId == null || !Number.isFinite(cityId)) return '';
	const forCity = postalCodes.filter((p) => p.cityId === cityId);
	if (forCity.length === 0) return '';
	const active = forCity.filter(
		(p) => p.statusId === StatusEnum.ACTIVE
	);
	const pool = active.length > 0 ? active : forCity;
	const pick = pool.reduce((best, row) =>
		row.id < best.id ? row : best
	);
	return String(pick.id);
}
