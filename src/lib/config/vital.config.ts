/**
 * Vital sign reference ranges and helpers.
 * Single source of truth for normal ranges used in forms and tables.
 */

import { VitalEnum } from '$lib/model/enum/vital.enum';

export type VitalKey =
	| VitalEnum.TEMPERATURE
	| VitalEnum.RESPIRATION
	| VitalEnum.PULSE
	| VitalEnum.BP_SYSTOLIC
	| VitalEnum.BP_DIASTOLIC
	| VitalEnum.SP_O2
	| VitalEnum.RBS;

export const VITAL_REFERENCE_RANGES: Record<
	VitalKey,
	{ min: number; max: number }
> = {
	[VitalEnum.TEMPERATURE]: { min: 36.2, max: 37.2 },
	[VitalEnum.RESPIRATION]: { min: 12, max: 18 },
	[VitalEnum.PULSE]: { min: 60, max: 100 },
	[VitalEnum.BP_SYSTOLIC]: { min: 90, max: 120 },
	[VitalEnum.BP_DIASTOLIC]: { min: 60, max: 90 },
	[VitalEnum.SP_O2]: { min: 95, max: 100 },
	[VitalEnum.RBS]: { min: 74, max: 140 }
};

export function getVitalPlaceholder(key: VitalKey): string {
	const { min, max } = VITAL_REFERENCE_RANGES[key];
	return `ref: ${min} <-> ${max}`;
}

export function toNumber(v: unknown): number | null {
	if (v == null) return null;
	const s = String(v).trim();
	if (!s) return null;
	const n = Number(s);
	if (!Number.isFinite(n)) return null;
	return n;
}

export function isOutOfRange(value: unknown, key: VitalKey): boolean {
	const n = toNumber(value);
	if (n == null) return false;
	const { min, max } = VITAL_REFERENCE_RANGES[key];
	return n < min || n > max;
}

/** For input fields: border + text when out of range. */
export function vitalInputClass(
	value: unknown,
	key: VitalKey
): string {
	return isOutOfRange(value, key) ? 'border-error text-error' : '';
}

/** For table display: text when out of range. */
export function vitalTextClass(
	value: unknown,
	key: VitalKey
): string {
	return isOutOfRange(value, key) ? 'text-error font-medium' : '';
}
