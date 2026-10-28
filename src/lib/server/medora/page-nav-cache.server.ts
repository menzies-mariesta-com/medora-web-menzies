import { ensureDb } from '$lib/server/db';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';

const TTL_MS = 120_000;

/** ED registration "New patient" tab; detect stale nav cache after seed. */
const ED_ADMISSION_NEW_PATIENT_PAGE_ID = 123003;
/** Nursing root page; detect stale nav after OPD/IPD/ED pages are consolidated. */
const NURSING_ROOT_PAGE_ID = 910000;
const NURSING_VITAL_PAGE_ID = 800001;
const NURSING_CENSUS_PAGE_ID = 1900001;
const NURSING_TRACK_BOARD_PAGE_ID = 120;
/** Retired nursing group pages that must not appear in nav. */
const RETIRED_NURSING_PAGE_IDS = new Set([8, 44, 481]);
const ER_BILLING_PAGE_ID = 150004;

let cached: PageWithRelations[] | null = null;
let cachedAt = 0;

function navCacheLooksCurrent(pages: PageWithRelations[]): boolean {
	const nursingRoot = pages.find(
		(p) => p.id === NURSING_ROOT_PAGE_ID
	);
	if (!nursingRoot || nursingRoot.moduleId !== 4) return false;

	if (pages.some((p) => RETIRED_NURSING_PAGE_IDS.has(p.id))) {
		return false;
	}

	const vital = pages.find((p) => p.id === NURSING_VITAL_PAGE_ID);
	if (
		!vital ||
		vital.parentId !== NURSING_ROOT_PAGE_ID ||
		vital.pageUrl !== '/medora/home/nursing-workbench/vital'
	) {
		return false;
	}

	const census = pages.find((p) => p.id === NURSING_CENSUS_PAGE_ID);
	if (
		!census ||
		census.parentId !== NURSING_ROOT_PAGE_ID ||
		census.pageUrl !== '/medora/home/nursing-workbench/census'
	) {
		return false;
	}

	const trackBoard = pages.find(
		(p) => p.id === NURSING_TRACK_BOARD_PAGE_ID
	);
	if (
		!trackBoard ||
		trackBoard.moduleId !== 4 ||
		trackBoard.parentId !== NURSING_ROOT_PAGE_ID
	) {
		return false;
	}

	if (!pages.some((p) => p.id === ED_ADMISSION_NEW_PATIENT_PAGE_ID)) {
		return false;
	}
	if (!pages.some((p) => p.id === ER_BILLING_PAGE_ID)) return false;
	return true;
}

/** Cached full page tree for module bar (status + module relations). */
export async function getMedoraPagesForNav(): Promise<PageWithRelations[]> {
	const now = Date.now();
	if (cached && now - cachedAt < TTL_MS) {
		if (navCacheLooksCurrent(cached)) return cached;
		invalidateMedoraPagesNavCache();
	}

	const fullPages = (await ensureDb().query.pageTable.findMany({
		with: {
			module: true,
			status: true
		}
	})) as unknown as PageWithRelations[];

	cached = fullPages;
	cachedAt = now;
	return fullPages;
}

/** Call after page CRUD in admin (optional). */
export function invalidateMedoraPagesNavCache(): void {
	cached = null;
	cachedAt = 0;
}
