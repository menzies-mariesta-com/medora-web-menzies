import { page } from '$app/state';
import type {
	MedoraPageModuleRow,
	MedoraPageRow,
	PageWithRelations
} from '$lib/model/type/medora/page.type';
import { medoraHospitalNavHref } from '$lib/model/enum/routes.enum';
export type PageTreeItem = MedoraPageRow & {
	children: PageTreeItem[];
};

let fullPageData = $state<PageWithRelations[]>([]);

export function setPageData(data: PageWithRelations[]) {
	fullPageData = data;
}

/** Use in reactive context, e.g. `$derived(getPageData())` */
export function getPageData(): MedoraPageRow[] {
	return pageRowsFrom(fullPageData);
}

/** Nav rows from the raw page list (drops the `module` / `status` relations). */
export function pageRowsFrom(
	full: PageWithRelations[]
): MedoraPageRow[] {
	return full.map(({ module: _m, status: _s, ...p }) => p);
}

/** Use in reactive context, e.g. `$derived(getUniqueModuleData())` */
export function getUniqueModuleData(): MedoraPageModuleRow[] {
	return uniqueModulesFrom(fullPageData);
}

/** One row per module referenced by a page, in first-seen order. */
export function uniqueModulesFrom(
	full: PageWithRelations[]
): MedoraPageModuleRow[] {
	return Array.from(
		new Map(
			full
				.filter(
					(
						p
					): p is PageWithRelations & {
						module: NonNullable<PageWithRelations['module']>;
					} => p.module != null
				)
				.map((p) => [p.module.id, p.module])
		).values()
	);
}

function buildPageTree(
	pages: MedoraPageRow[],
	parentId: number | null = null
): PageTreeItem[] {
	return pages
		.filter((p) => p.parentId === parentId)
		.map((p) => ({
			...p,
			children: buildPageTree(pages, p.id)
		}));
}

/** Use in reactive context, e.g. $derived(getPageTree()) */
export function getPageTree(): PageTreeItem[] {
	return buildPageTree(getPageData());
}

/** Normalize path for comparison (no trailing slash) */
function normPath(path: string | null | undefined): string {
	if (path == null) return '';
	return path.replace(/\/$/, '') || '/';
}

/**
 * Normalize current URL path for matching against DB pageUrl.
 * DB stores /medora/home/...; real URL is /medora/hospital/:id/home/...
 * So we rewrite pathname to the "logical" path for comparison.
 */
export function pathnameForPageMatch(): string {
	const path = normPath(page.url.pathname);
	const match = path.match(
		/^\/medora\/hospital\/([^/]+)\/home(\/.*)?$/
	);
	if (match) {
		return `/medora/home${match[2] ?? ''}`;
	}
	return path;
}

/**
 * The page that represents the current "section" (whose children are the sub-tabs).
 * When we're on a child URL (e.g. /staff/registration), use the longest strict prefix
 * so we get Staff, not Registration. When we're on the section index (e.g. /staff), use exact match.
 * Use in reactive context, e.g. $derived(getCurrentParentPage()).
 */
export function getCurrentParentPage(): MedoraPageRow | null {
	const path = normPath(pathnameForPageMatch());
	const data = getPageData();
	// 1. Longest strict prefix: we're under /staff/registration → parent is Staff
	let best: MedoraPageRow | null = null;
	let bestLen = -1;
	for (const p of data) {
		const u = normPath(p.pageUrl);
		if (!u) continue;
		if (path.startsWith(u + '/') && u.length > bestLen) {
			bestLen = u.length;
			best = p;
		}
	}
	if (best) return best;
	// 2. Exact match: we're on /staff → that page is the section, its children are the tabs
	for (const p of data) {
		if (normPath(p.pageUrl) === path) return p;
	}
	return null;
}

/**
 * Child pages of currentParentPage (for sub-nav / tabs).
 * Ordered by sequenceNo.
 * Use in reactive context, e.g. $derived(getSubPages()).
 */
export function getSubPages(): MedoraPageRow[] {
	const parent = getCurrentParentPage();
	if (!parent) return [];
	return getSubPagesForParentId(parent.id);
}

/**
 * Child pages of a fixed parent page URL (for nested layouts that must not
 * inherit the deepest URL prefix as the tab parent).
 */
export function getSubPagesForPageUrl(
	pageUrl: string | null | undefined
): MedoraPageRow[] {
	return getSubPagesForPageUrlFromRows(pageUrl, getPageData());
}

/** Same as {@link getSubPagesForPageUrl} but uses an explicit page list (SSR layout data). */
export function getSubPagesForPageUrlFromRows(
	pageUrl: string | null | undefined,
	rows: MedoraPageRow[]
): MedoraPageRow[] {
	const u = normPath(pageUrl);
	if (!u) return [];
	const parent = rows.find((p) => normPath(p.pageUrl) === u);
	if (!parent) return [];
	return rows
		.filter((p) => p.parentId === parent.id)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
}

function getSubPagesForParentId(parentId: number): MedoraPageRow[] {
	return getPageData()
		.filter((p) => p.parentId === parentId)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
}

/**
 * Hospital URL for the first sub-page when the current route is a section index
 * (same rules as {@link medoraSectionIndexRedirectTarget} on the server).
 */
export function getSectionIndexRedirectTarget(
	hospitalId: string,
	search = ''
): string | null {
	if (!hospitalId) return null;
	const logicalPath = pathnameForPageMatch();
	if (normPath(logicalPath) === normPath('/medora/home')) return null;
	const indexPage = getPageData().find(
		(p) => normPath(p.pageUrl) === normPath(logicalPath)
	);
	if (!indexPage) return null;
	const subs = getSubPagesForParentId(indexPage.id);
	const first = subs.find((p) => medoraHospitalNavHref(hospitalId, p.pageUrl));
	if (!first?.pageUrl) return null;
	const target = medoraHospitalNavHref(hospitalId, first.pageUrl);
	if (!target) return null;
	if (!search || search === '?') return target;
	return target + (search.startsWith('?') ? search : `?${search}`);
}
