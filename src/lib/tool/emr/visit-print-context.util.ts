import type { VisitLike } from '$lib/util/document-placeholder.util';

/** Full visit graph for Document Master placeholders (same source as EMR visit bar). */
export async function fetchVisitLikeForDocumentPrint(
	hospitalId: string,
	visitId: string
): Promise<VisitLike | null> {
	const id = visitId.trim();
	if (!hospitalId || !id) return null;
	try {
		const qs = new URLSearchParams({ mode: 'visit.bar', visitId: id });
		const res = await fetch(
			`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/emr/visit-list?${qs}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return null;
		const pack = (await res.json()) as { visit?: VisitLike | null };
		return pack.visit ?? null;
	} catch {
		return null;
	}
}

type HospitalPrintRow = {
	name?: string | null;
	logoUrl?: string | null;
	address?: string | null;
	phone?: string | null;
	email?: string | null;
};

/** Hospital letterhead tokens when print has no visit (e.g. appointment slip). */
export async function fetchHospitalPrintPlaceholders(
	hospitalId: string
): Promise<Record<string, string>> {
	if (!hospitalId.trim()) return {};
	try {
		const res = await fetch(
			`/api/medora/hospital?id=${encodeURIComponent(hospitalId)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return {};
		const h = (await res.json()) as HospitalPrintRow;
		const dash = (v: string | null | undefined) => v?.trim() || '—';
		return {
			'{{hospital_name}}': dash(h.name),
			'{{hospital_logo}}': dash(h.logoUrl),
			'{{hospital_address}}': dash(h.address),
			'{{hospital_phone}}': dash(h.phone),
			'{{hospital_email}}': dash(h.email)
		};
	} catch {
		return {};
	}
}