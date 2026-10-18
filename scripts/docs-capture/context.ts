import type { APIRequestContext } from '@playwright/test';
import { DEFAULT_HOSPITAL_ID } from './constants.ts';

export async function resolveDemoVisitId(
	request: APIRequestContext,
	hospitalId = DEFAULT_HOSPITAL_ID
): Promise<string | null> {
	const url = `/api/medora/hospital/${hospitalId}/home/emr/visit-list?mode=visit.list&page=1&pageSize=5`;
	const res = await request.get(url);
	if (!res.ok()) return null;
	const json = (await res.json()) as {
		result?: { data?: { id: string }[] };
	};
	const row = json.result?.data?.[0];
	return row?.id ?? null;
}
