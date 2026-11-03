import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalPageUrl,
	requestPathToDbPageUrl
} from '$lib/model/enum/routes.enum';
import { isMedoraSectionIndexRedirectExempt } from '$lib/tool/medora/medora-section-index-redirect-exempt.util';

export type MedoraNavPageRow = {
	id: number;
	parentId?: number | null;
	pageUrl?: string | null;
	sequenceNo?: number | null;
};

function normPath(path: string | null | undefined): string {
	return (path ?? '').replace(/\/$/, '') || '/';
}

/**
 * When the current URL is a section index that has child pages in nav data,
 * return the hospital URL for the first child (by sequenceNo).
 */
export function medoraSectionIndexRedirectTarget(
	pathname: string,
	hospitalId: string,
	pages: MedoraNavPageRow[]
): string | null {
	if (!hospitalId) return null;
	const dbPageUrl = requestPathToDbPageUrl(pathname, hospitalId);
	if (!dbPageUrl || normPath(dbPageUrl) === normPath('/medora/home')) {
		return null;
	}

	const indexPage = pages.find(
		(p) => normPath(p.pageUrl) === normPath(dbPageUrl)
	);
	if (!indexPage) return null;
	if (isMedoraSectionIndexRedirectExempt(indexPage.pageUrl)) return null;

	const children = pages
		.filter((p) => p.parentId === indexPage.id)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
	const first = children[0];
	if (!first?.pageUrl) return null;

	return medoraHospitalPageUrl(hospitalId, first.pageUrl);
}

export function medoraMaybeRedirectSectionIndex(input: {
	pathname: string;
	hospitalId: string;
	pages: MedoraNavPageRow[];
}): void {
	const target = medoraSectionIndexRedirectTarget(
		input.pathname,
		input.hospitalId,
		input.pages
	);
	if (target) throw redirect(302, target);
}

function withSectionIndexRedirect<T extends { pageData: MedoraNavPageRow[] }>(
	hospitalId: string,
	pathname: string,
	payload: T
): T {
	if (payload.pageData.length > 0) {
		medoraMaybeRedirectSectionIndex({
			hospitalId,
			pathname,
			pages: payload.pageData
		});
	}
	return payload;
}

export { withSectionIndexRedirect };
