import { page } from '$app/state';
import type {
	MedoraPageModuleRow,
	MedoraPageRow,
	PageWithRelations
} from '$lib/model/type/medora/page.type';

export type PageTreeItem = MedoraPageRow & { children: PageTreeItem[] };

let fullPageData = $state<PageWithRelations[]>([]);

export function setPageData(data: PageWithRelations[]) {
	fullPageData = data;
}

/** Use in reactive context, e.g. $derived(getPageData()) */
export function getPageData(): MedoraPageRow[] {
	return fullPageData.map(({ module: _m, status: _s, ...p }) => p);
}

/** Use in reactive context, e.g. $derived(getUniqueModuleData()) */
export function getUniqueModuleData(): MedoraPageModuleRow[] {
	return Array.from(
		new Map(
			fullPageData
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
	const u = normPath(pageUrl);
	if (!u) return [];
	const parent = getPageData().find((p) => normPath(p.pageUrl) === u);
	if (!parent) return [];
	return getSubPagesForParentId(parent.id);
}

function getSubPagesForParentId(parentId: number): MedoraPageRow[] {
	return getPageData()
		.filter((p) => p.parentId === parentId)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
}
