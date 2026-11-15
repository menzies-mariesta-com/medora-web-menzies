import { ensureDb } from '$lib/server/db';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';
import {
	cacheGetOrSet,
	invalidateCacheKey,
	invalidateCacheTag
} from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';

const TTL_SECONDS = 120;

/** ED registration "New patient" tab; detect stale nav cache after seed. */
const ED_ADMISSION_NEW_PATIENT_PAGE_ID = 123003;
/** Nursing root page; detect stale nav after OPD/IPD/ED pages are consolidated. */
const NURSING_ROOT_PAGE_ID = 910000;
const NURSING_VITAL_PAGE_ID = 800001;
const NURSING_CENSUS_PAGE_ID = 1900001;
const NURSING_TRACK_BOARD_PAGE_ID = 120;
/** Retired nursing group pages that must not appear in nav. */
const RETIRED_NURSING_PAGE_IDS = new Set([8, 44, 481]);
const BILL_PAGE_ID = 800100;
const BILL_ADVANCE_PAGE_ID = 800200;
/** Retired OP/IP/ER billing top-level pages (unified under Bill). */
const RETIRED_BILLING_PAGE_IDS = new Set([15, 150001, 150004]);

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

	const billPage = pages.find((p) => p.id === BILL_PAGE_ID);
	if (
		!billPage ||
		billPage.moduleId !== 8 ||
		billPage.parentId != null ||
		billPage.pageUrl !== '/medora/home/billing/bill'
	) {
		return false;
	}

	const billAdvance = pages.find((p) => p.id === BILL_ADVANCE_PAGE_ID);
	if (
		!billAdvance ||
		billAdvance.parentId != null ||
		billAdvance.pageUrl !== '/medora/home/billing/advance-deposit'
	) {
		return false;
	}

	if (pages.some((p) => RETIRED_BILLING_PAGE_IDS.has(p.id))) {
		return false;
	}

	return true;
}

async function loadMedoraPagesForNav(): Promise<PageWithRelations[]> {
	return cacheGetOrSet({
		key: cacheKeys.medoraNavPages(),
		ttlSeconds: TTL_SECONDS,
		tags: [cacheTags.medoraNav],
		factory: async () =>
			(await ensureDb().query.pageTable.findMany({
				with: {
					module: true,
					status: true
				}
			})) as unknown as PageWithRelations[]
	});
}

/** Cached full page tree for module bar (status + module relations). */
export async function getMedoraPagesForNav(): Promise<PageWithRelations[]> {
	let pages = await loadMedoraPagesForNav();
	if (!navCacheLooksCurrent(pages)) {
		await invalidateMedoraPagesNavCache();
		pages = await loadMedoraPagesForNav();
	}
	return pages;
}

/** Call after page CRUD in admin (optional). */
export async function invalidateMedoraPagesNavCache(): Promise<void> {
	await invalidateCacheKey(cacheKeys.medoraNavPages());
	await invalidateCacheTag(cacheTags.medoraNav);
}