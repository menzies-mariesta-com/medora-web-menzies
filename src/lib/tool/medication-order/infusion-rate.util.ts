/** mL/hr from total volume and duration in hours. */
export function mlPerHourFromVolumeAndHours(
	totalVolumeMl: number,
	durationHours: number
): number {
	if (durationHours <= 0) return 0;
	return totalVolumeMl / durationHours;
}

/** Duration in hours to finish infusion at a fixed rate. */
export function hoursFromVolumeAndRate(
	totalVolumeMl: number,
	rateMlHr: number
): number {
	if (rateMlHr <= 0) return 0;
	return totalVolumeMl / rateMlHr;
}

/** Weight-based rate: mg/kg/min to mL/hr given concentration mg/mL and patient weight kg. */
export function mlPerHourFromWeightDose(input: {
	doseMgKgMin: number;
	weightKg: number;
	concentrationMgPerMl: number;
}): number {
	if (input.concentrationMgPerMl <= 0) return 0;
	const mgPerHour =
		input.doseMgKgMin * input.weightKg * 60;
	return mgPerHour / input.concentrationMgPerMl;
}
