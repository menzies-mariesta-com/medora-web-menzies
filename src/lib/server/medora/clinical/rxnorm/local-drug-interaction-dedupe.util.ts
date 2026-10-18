import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';

export type DedupeInteraction = {
	key: string;
	severity: string;
};

const SEVERITY_RANK: Record<string, number> = {
	[PrescribingAlertSeverityEnum.SEVERE]: 3,
	[PrescribingAlertSeverityEnum.MODERATE]: 2,
	[PrescribingAlertSeverityEnum.MILD]: 1,
	info: 0
};

export function mergeInteractionSeverity(
	current: string,
	incoming: string
): string {
	const rNew = SEVERITY_RANK[incoming] ?? 0;
	const rOld = SEVERITY_RANK[current] ?? 0;
	return rNew > rOld ? incoming : current;
}

export function interactionPairKey(a: string, b: string, source: string): string {
	return [a, b, source].sort().join('|');
}
