import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { RXNORM_PRESCRIBE_TTYS } from '$lib/model/enum/rxnorm.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const TTY_RANK: Record<string, number> = {
	SCD: 0,
	GP: 1,
	BN: 2,
	SCDF: 3,
	IN: 4,
	PIN: 5
};

export type RxnormConceptDto = {
	rxcui: string;
	name: string;
	tty: string;
	releaseId: string;
};

export async function getHospitalRxnormCatalogMeta() {
	const db = ensureDb();
	const [row] = await db
		.select()
		.from(table.rxnormReleaseTable)
		.orderBy(desc(table.rxnormReleaseTable.importedAt))
		.limit(1);
	return row ?? null;
}

export async function getRxnormImportStatus() {
	const release = await getHospitalRxnormCatalogMeta();
	const db = ensureDb();
	const [ddi] = await db
		.select({
			count: sql<number>`count(*)::int`,
			latest: sql<string>`max(${table.drugInteractionTable.updatedAt})`
		})
		.from(table.drugInteractionTable);
	return {
		release,
		interactionCount: ddi?.count ?? 0,
		interactionLatestAt: ddi?.latest ?? null
	};
}

export async function getRxnormConcept(rxcui: string): Promise<RxnormConceptDto | null> {
	const db = ensureDb();
	const [row] = await db
		.select({
			rxcui: table.rxnormConceptTable.rxcui,
			name: table.rxnormConceptTable.name,
			tty: table.rxnormConceptTable.tty,
			releaseId: table.rxnormConceptTable.releaseId
		})
		.from(table.rxnormConceptTable)
		.where(eq(table.rxnormConceptTable.rxcui, rxcui))
		.limit(1);
	return row ?? null;
}

export async function searchRxnormConcepts(input: {
	query: string;
	ttyFilter?: string | null;
	limit?: number;
}): Promise<RxnormConceptDto[]> {
	const q = input.query.trim();
	const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
	if (!q) return [];
	const db = ensureDb();
	const pattern = `%${q.replace(/%/g, '\\%')}%`;
	const conditions = [
		ilike(table.rxnormConceptTable.normalizedName, pattern),
		eq(table.rxnormConceptTable.rxcui, q)
	];
	if (input.ttyFilter?.trim()) {
		const rows = await db
			.select({
				rxcui: table.rxnormConceptTable.rxcui,
				name: table.rxnormConceptTable.name,
				tty: table.rxnormConceptTable.tty,
				releaseId: table.rxnormConceptTable.releaseId
			})
			.from(table.rxnormConceptTable)
			.where(
				and(or(...conditions), eq(table.rxnormConceptTable.tty, input.ttyFilter.trim()))
			)
			.limit(limit * 2);
		return sortRxnormResults(rows).slice(0, limit);
	}
	const rows = await db
		.select({
			rxcui: table.rxnormConceptTable.rxcui,
			name: table.rxnormConceptTable.name,
			tty: table.rxnormConceptTable.tty,
			releaseId: table.rxnormConceptTable.releaseId
		})
		.from(table.rxnormConceptTable)
		.where(or(...conditions))
		.limit(limit * 3);
	const filtered = rows.filter((r) =>
		RXNORM_PRESCRIBE_TTYS.includes(r.tty as (typeof RXNORM_PRESCRIBE_TTYS)[number])
	);
	return sortRxnormResults(filtered.length ? filtered : rows).slice(0, limit);
}

function sortRxnormResults(rows: RxnormConceptDto[]): RxnormConceptDto[] {
	return [...rows].sort((a, b) => {
		const ra = TTY_RANK[a.tty] ?? 99;
		const rb = TTY_RANK[b.tty] ?? 99;
		if (ra !== rb) return ra - rb;
		return a.name.localeCompare(b.name);
	});
}

export async function getIngredientsForRxcui(rxcui: string): Promise<RxnormConceptDto[]> {
	const db = ensureDb();
	const rels = await db
		.select({ ing: table.rxnormRelTable.rxcui2 })
		.from(table.rxnormRelTable)
		.where(
			and(
				eq(table.rxnormRelTable.rxcui1, rxcui),
				inArray(table.rxnormRelTable.rela, ['has_ingredient', 'consists_of'])
			)
		);
	const ids = [...new Set(rels.map((r) => r.ing))];
	if (!ids.length) {
		const self = await getRxnormConcept(rxcui);
		if (self?.tty === 'IN' || self?.tty === 'PIN') return self ? [self] : [];
		return [];
	}
	const concepts = await db
		.select({
			rxcui: table.rxnormConceptTable.rxcui,
			name: table.rxnormConceptTable.name,
			tty: table.rxnormConceptTable.tty,
			releaseId: table.rxnormConceptTable.releaseId
		})
		.from(table.rxnormConceptTable)
		.where(inArray(table.rxnormConceptTable.rxcui, ids));
	return concepts;
}
