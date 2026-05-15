import type { VisitServiceLinePrintRow } from '$lib/util/document-placeholder.util';

/** All service order lines for a visit (non-deleted details), for print / placeholders. */
export async function fetchVisitServiceLinePrintRows(params: {
	visitId: number;
	hospitalId: string;
}): Promise<VisitServiceLinePrintRow[]> {
	const { visitId, hospitalId } = params;
	const qs = new URLSearchParams({
		mode: 'print.visitServiceLines',
		visitId: String(visitId)
	});
	const res = await fetch(
		`/api/heka/hospital/${encodeURIComponent(hospitalId)}/home/nursing-workbench/emr/order?${qs.toString()}`,
		{ credentials: 'include', cache: 'no-store' }
	);
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(
			text || `Failed to load service lines: ${res.status}`
		);
	}
	return (await res.json()) as VisitServiceLinePrintRow[];
}
