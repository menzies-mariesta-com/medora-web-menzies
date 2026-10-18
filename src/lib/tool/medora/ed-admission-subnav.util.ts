import type { MedoraPageRow } from '$lib/model/type/medora/page.type';
import {
	getPageData,
	getSubPagesForPageUrl
} from '$lib/state/page.state.svelte';

/** DB page_url for Emergency → Registration section (parent of admission tabs). */
export const ED_ADMISSION_SECTION_PAGE_URL =
	'/medora/home/emergency/admission';

type AdmissionTabSeed = Pick<
	MedoraPageRow,
	'id' | 'pageUrl' | 'sequenceNo' | 'name'
>;

/** Canonical tabs when nav cache or user_group grants lag behind seed. */
export function edAdmissionTabFallbacks(
	labels: {
		erRegistration: string;
		newPatient: string;
		list: string;
	}
): AdmissionTabSeed[] {
	return [
		{
			id: 123001,
			pageUrl: `${ED_ADMISSION_SECTION_PAGE_URL}/new`,
			sequenceNo: 1,
			name: labels.erRegistration
		},
		{
			id: 123003,
			pageUrl: `${ED_ADMISSION_SECTION_PAGE_URL}/new-patient`,
			sequenceNo: 2,
			name: labels.newPatient
		},
		{
			id: 123002,
			pageUrl: `${ED_ADMISSION_SECTION_PAGE_URL}/list`,
			sequenceNo: 3,
			name: labels.list
		}
	];
}

function normUrl(url: string | null | undefined): string {
	return (url ?? '').replace(/\/$/, '') || '/';
}

/**
 * Sub-nav tabs for ED registration: DB-driven, merged with fallbacks so all
 * three routes stay visible even when server page nav cache is stale.
 */
export function getEdAdmissionSubPages(
	labels: {
		erRegistration: string;
		newPatient: string;
		list: string;
	}
): MedoraPageRow[] {
	const fromDb = getSubPagesForPageUrl(ED_ADMISSION_SECTION_PAGE_URL);
	const byUrl = new Map<string, MedoraPageRow>();
	for (const p of fromDb) {
		byUrl.set(normUrl(p.pageUrl), p);
	}
	for (const fb of edAdmissionTabFallbacks(labels)) {
		const key = normUrl(fb.pageUrl);
		if (!byUrl.has(key)) {
			const parent = getPageData().find(
				(p) => normUrl(p.pageUrl) === ED_ADMISSION_SECTION_PAGE_URL
			);
			byUrl.set(key, {
				...fb,
				moduleId: parent?.moduleId ?? 12,
				statusId: parent?.statusId ?? 1,
				parentId: parent?.id ?? 123
			});
		}
	}
	return Array.from(byUrl.values()).sort(
		(a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0)
	);
}
