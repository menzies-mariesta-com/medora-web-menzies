import { fetchJsonCached } from '$lib/util/client-fetch-cache.util';

export type VisitBarPack = {
	visit?: {
		visitTypeId?: number | null;
		visitType?: { id?: number } | null;
	};
};

export type VisitBarVisitTypeResult =
	| { ok: true; visitTypeId: number | null }
	| { ok: false; message: string };

export function visitTypeIdFromPack(pack: VisitBarPack): number | null {
	const fromRel = pack.visit?.visitType?.id;
	const fromCol = pack.visit?.visitTypeId;
	if (typeof fromRel === 'number') return fromRel;
	if (typeof fromCol === 'number') return fromCol;
	return null;
}

export function visitBarListUrl(hospitalId: string, visitId: string): string {
	const qs = new URLSearchParams({
		mode: 'visit.bar',
		visitId
	});
	return `/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/emr/visit-list?${qs}`;
}

/** Visit bar read for gating — always bypasses client SWR (fresh visit type). */
export async function loadVisitBarVisitType(
	hospitalId: string,
	visitId: string,
	init?: RequestInit
): Promise<VisitBarVisitTypeResult> {
	const url = visitBarListUrl(hospitalId, visitId);
	try {
		const pack = await fetchJsonCached<VisitBarPack>(url, {
			bypass: true,
			...init
		});
		return { ok: true, visitTypeId: visitTypeIdFromPack(pack) };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'visit bar failed';
		return { ok: false, message };
	}
}