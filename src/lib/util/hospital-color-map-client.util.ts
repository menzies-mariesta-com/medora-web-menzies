import type { ColorConfigurationPayload } from '$lib/model/type/medora/color-configuration.type';
import { fetchJsonCached } from '$lib/util/client-fetch-cache.util';

const mapByHospital = new Map<string, Record<string, string>>();

export function peekHospitalColorMap(
	hospitalId: string
): Record<string, string> | null {
	return mapByHospital.get(hospitalId) ?? null;
}

export async function loadHospitalColorMap(
	hospitalId: string
): Promise<Record<string, string>> {
	const url = `/api/medora/hospital/${hospitalId}/home/administration/color-configuration`;
	const payload = await fetchJsonCached<ColorConfigurationPayload>(url);
	mapByHospital.set(hospitalId, payload.resolvedMap);
	return payload.resolvedMap;
}

export function clearHospitalColorMapCache(hospitalId?: string): void {
	if (hospitalId) mapByHospital.delete(hospitalId);
	else mapByHospital.clear();
}