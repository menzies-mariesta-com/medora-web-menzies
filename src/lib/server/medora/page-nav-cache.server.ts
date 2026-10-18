import { ensureDb } from '$lib/server/db';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';

const TTL_MS = 120_000;

/** ED registration "New patient" tab; detect stale nav cache after seed. */
const ED_ADMISSION_NEW_PATIENT_PAGE_ID = 123003;
/** Nursing ED parent; detect stale nav after page moves from Emergency module. */
const NURSING_ED_PARENT_PAGE_ID = 481;
const ER_BILLING_PAGE_ID = 150004;

let cached: PageWithRelations[] | null = null;
let cachedAt = 0;

function navCacheLooksCurrent(pages: PageWithRelations[]): boolean {
	const nursingEd = pages.find((p) => p.id === NURSING_ED_PARENT_PAGE_ID);
	if (!nursingEd || nursingEd.moduleId !== 4) return false;
	const trackBoard = pages.find((p) => p.id === 120);
	if (
		trackBoard &&
		(trackBoard.moduleId !== 4 ||
			trackBoard.parentId !== NURSING_ED_PARENT_PAGE_ID)
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
