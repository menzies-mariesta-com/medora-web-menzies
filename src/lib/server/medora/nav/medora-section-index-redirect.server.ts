import { redirect } from '@sveltejs/kit';
import {
	medoraHospitalNavHref,
	requestPathToDbPageUrl
} from '$lib/model/enum/routes.enum';
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
function appendSearch(target: string, search: string): string {
	if (!search || search === '?') return target;
	return target + (search.startsWith('?') ? search : `?${search}`);
}

export function medoraSectionIndexRedirectTarget(
	pathname: string,
	hospitalId: string,
	pages: MedoraNavPageRow[],
	search = ''
): string | null {
	if (!hospitalId) return null;
	const dbPageUrl = requestPathToDbPageUrl(pathname, hospitalId);
	if (
		!dbPageUrl ||
		normPath(dbPageUrl) === normPath('/medora/home')
	) {
		return null;
	}
	const indexPage = pages.find(
		(p) => normPath(p.pageUrl) === normPath(dbPageUrl)
	);
	if (!indexPage) return null;

	const children = pages
		.filter((p) => p.parentId === indexPage.id)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
	const first = children.find((p) =>
		medoraHospitalNavHref(hospitalId, p.pageUrl)
	);
	if (!first?.pageUrl) return null;

	const target = medoraHospitalNavHref(hospitalId, first.pageUrl);
	if (!target) return null;
	return appendSearch(target, search);
}

export function medoraMaybeRedirectSectionIndex(input: {
	pathname: string;
	hospitalId: string;
	pages: MedoraNavPageRow[];
	search?: string;
}): void {
	const target = medoraSectionIndexRedirectTarget(
		input.pathname,
		input.hospitalId,
		input.pages,
		input.search ?? ''
	);
	if (target) throw redirect(302, target);
}

function withSectionIndexRedirect<
	T extends { pageData: MedoraNavPageRow[] }
>(hospitalId: string, pathname: string, payload: T, search = ''): T {
	if (payload.pageData.length > 0) {
		medoraMaybeRedirectSectionIndex({
			hospitalId,
			pathname,
			pages: payload.pageData,
			search
		});
	}
	return payload;
}

export { withSectionIndexRedirect };
