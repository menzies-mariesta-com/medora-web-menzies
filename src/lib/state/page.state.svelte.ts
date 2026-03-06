import { page } from '$app/state';
import type {
	ModuleSchema,
	PageSchema
} from '$lib/server/db/schema-type';
import type { PageWithRelations } from '$lib/remote/table/information-table/page.remote';

export type PageTreeItem = PageSchema & { children: PageTreeItem[] };

let fullPageData = $state<PageWithRelations[]>([]);

export function setPageData(data: PageWithRelations[]) {
	fullPageData = data;
}

/** Use in reactive context, e.g. $derived(getPageData()) */
export function getPageData(): PageSchema[] {
	return fullPageData.map(
		({ module: _m, status: _s, ...p }) => p
	) as PageSchema[];
}

/** Use in reactive context, e.g. $derived(getUniqueModuleData()) */
export function getUniqueModuleData(): ModuleSchema[] {
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
	) as ModuleSchema[];
}

function buildPageTree(
	pages: PageSchema[],
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
 * DB stores /heka/home/...; real URL is /heka/hospital/:id/home/...
 * So we rewrite pathname to the "logical" path for comparison.
 */
export function pathnameForPageMatch(): string {
	const path = normPath(page.url.pathname);
	const match = path.match(
		/^\/heka\/hospital\/([^/]+)\/home(\/.*)?$/
	);
	if (match) {
		return `/heka/home${match[2] ?? ''}`;
	}
	return path;
}

/**
 * The page that represents the current "section" (whose children are the sub-tabs).
 * When we're on a child URL (e.g. /staff/registration), use the longest strict prefix
 * so we get Staff, not Registration. When we're on the section index (e.g. /staff), use exact match.
 * Use in reactive context, e.g. $derived(getCurrentParentPage()).
 */
export function getCurrentParentPage(): PageSchema | null {
	const path = normPath(pathnameForPageMatch());
	const data = getPageData();
	// 1. Longest strict prefix: we're under /staff/registration → parent is Staff
	let best: PageSchema | null = null;
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
 * Use in reactive context, e.g. $derived(getSubPages()).
 */
export function getSubPages(): PageSchema[] {
	const parent = getCurrentParentPage();
	if (!parent) return [];
	return getPageData().filter((p) => p.parentId === parent.id);
}
