import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { DrugInteractionSourceEnum } from '$lib/model/enum/rxnorm.enum';
import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { getIngredientsForRxcui } from './rxnorm-catalog.server';

export type LocalInteractionHit = {
	source: string;
	severity: string;
	description: string;
	management: string | null;
	rxcuiA: string | null;
	rxcuiB: string | null;
	ingredientRxcuiA: string | null;
	ingredientRxcuiB: string | null;
	externalId: string;
};

const SEVERITY_RANK: Record<string, number> = {
	[PrescribingAlertSeverityEnum.SEVERE]: 3,
	[PrescribingAlertSeverityEnum.MODERATE]: 2,
	[PrescribingAlertSeverityEnum.MILD]: 1,
	info: 0
};

export async function expandOrderLineToIngredientRxcuis(
	rxcui: string
): Promise<string[]> {
	const ings = await getIngredientsForRxcui(rxcui);
	return ings.map((i) => i.rxcui);
}

export async function findLocalDrugInteractions(
	orderedRxcuis: string[]
): Promise<LocalInteractionHit[]> {
	const unique = [...new Set(orderedRxcuis.filter(Boolean))];
	if (unique.length < 1) return [];

	const ingredientSets = await Promise.all(
		unique.map(async (rxcui) => ({
			rxcui,
			ings: await expandOrderLineToIngredientRxcuis(rxcui)
		}))
	);
	const allIngredients = [
		...new Set(ingredientSets.flatMap((s) => s.ings))
	];

	const db = ensureDb();
	const pairConditions = [];
	for (let i = 0; i < unique.length; i++) {
		for (let j = i + 1; j < unique.length; j++) {
			const a = unique[i];
			const b = unique[j];
			pairConditions.push(
				and(
					eq(table.drugInteractionTable.rxcuiA, a),
					eq(table.drugInteractionTable.rxcuiB, b)
				),
				and(
					eq(table.drugInteractionTable.rxcuiA, b),
					eq(table.drugInteractionTable.rxcuiB, a)
				)
			);
		}
	}
	for (let i = 0; i < allIngredients.length; i++) {
		for (let j = i + 1; j < allIngredients.length; j++) {
			const a = allIngredients[i];
			const b = allIngredients[j];
			pairConditions.push(
				and(
					eq(table.drugInteractionTable.ingredientRxcuiA, a),
					eq(table.drugInteractionTable.ingredientRxcuiB, b)
				),
				and(
					eq(table.drugInteractionTable.ingredientRxcuiA, b),
					eq(table.drugInteractionTable.ingredientRxcuiB, a)
				)
			);
		}
	}
	if (!pairConditions.length) return [];

	const rows = await db
		.select()
		.from(table.drugInteractionTable)
		.where(or(...pairConditions));

	const dedupe = new Map<string, LocalInteractionHit>();
	for (const row of rows) {
		const key = [
			row.ingredientRxcuiA ?? row.rxcuiA ?? '',
			row.ingredientRxcuiB ?? row.rxcuiB ?? '',
			row.source
		]
			.sort()
			.join('|');
		const existing = dedupe.get(key);
		const hit: LocalInteractionHit = {
			source: row.source,
			severity: row.severity,
			description: row.description,
			management: row.management,
			rxcuiA: row.rxcuiA,
			rxcuiB: row.rxcuiB,
			ingredientRxcuiA: row.ingredientRxcuiA,
			ingredientRxcuiB: row.ingredientRxcuiB,
			externalId: row.externalId
		};
		if (!existing) {
			dedupe.set(key, hit);
			continue;
		}
		const rNew = SEVERITY_RANK[hit.severity] ?? 0;
		const rOld = SEVERITY_RANK[existing.severity] ?? 0;
		if (rNew > rOld) dedupe.set(key, hit);
	}
	return [...dedupe.values()];
}

export function mergeInteractionSources(hits: LocalInteractionHit[]): string {
	const sources = [...new Set(hits.map((h) => h.source))];
	return sources.length ? sources.join(', ') : DrugInteractionSourceEnum.DDINTER;
}
