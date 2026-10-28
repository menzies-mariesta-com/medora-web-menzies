import { VisitTypeEnum } from '$lib/model/enum/db-link';

export type BillingApiSegment = 'op-billing' | 'er-billing' | 'ip-billing';

/** Map visit type to the billing API segment (OP-style, ER, or IP). */
export function billingApiSegmentForVisitType(
	visitTypeId: number | null | undefined
): BillingApiSegment {
	if (visitTypeId === VisitTypeEnum.IPD) return 'ip-billing';
	if (visitTypeId === VisitTypeEnum.ED) return 'er-billing';
	return 'op-billing';
}

export async function fetchVisitTypeIdForBilling(input: {
	hospitalId: string;
	visitId: string;
	signal?: AbortSignal;
}): Promise<number | null> {
	const visitUuid = input.visitId.trim();
	const hid = input.hospitalId.trim();
	if (!visitUuid || !hid) return null;

	const qs = new URLSearchParams({
		mode: 'visit.bar',
		visitId: visitUuid
	});
	const res = await fetch(
		`/api/medora/hospital/${encodeURIComponent(hid)}/home/emr/visit-list?${qs}`,
		{ signal: input.signal }
	);
	if (!res.ok) return null;

	const pack = (await res.json()) as {
		visit?: {
			visitTypeId?: number | null;
			visitType?: { id?: number } | null;
		};
	};
	const fromRel = pack.visit?.visitType?.id;
	const fromCol = pack.visit?.visitTypeId;
	if (typeof fromRel === 'number') return fromRel;
	if (typeof fromCol === 'number') return fromCol;
	return null;
}
