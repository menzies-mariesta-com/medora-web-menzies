import { and, eq, inArray } from 'drizzle-orm';
import { PrescribingAlertSeverityEnum } from '$lib/model/enum/clinical-platform.enum';
import type { CdsScreenResult } from '$lib/model/type/medora/clinical-platform.type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	expandOrderLineToIngredientRxcuis,
	findLocalDrugInteractions
} from './rxnorm/local-drug-interaction.server';
import { searchRxnormConcepts } from './rxnorm/rxnorm-catalog.server';

type ScreenAlert = {
	alertType: string;
	severity: string;
	message: string;
	conceptRef?: string;
};

export async function screenDraftMedicationOrder(input: {
	hospitalId: string;
	visitId: string;
	itemMasterIds: number[];
	staffId: string;
	batchId?: number | null;
}): Promise<CdsScreenResult> {
	const db = ensureDb();
	const items = input.itemMasterIds.length
		? await db
				.select({
					id: table.itemMasterTable.id,
					rxnormRxcui: table.itemMasterTable.rxnormRxcui,
					itemName: table.itemMasterTable.itemName
				})
				.from(table.itemMasterTable)
				.where(inArray(table.itemMasterTable.id, input.itemMasterIds))
		: [];

	const alerts: ScreenAlert[] = [];
	const mappedRxcuis: string[] = [];

	for (const item of items) {
		const rxcui = item.rxnormRxcui?.trim();
		if (!rxcui) {
			alerts.push({
				alertType: 'unmapped_drug',
				severity: PrescribingAlertSeverityEnum.MODERATE,
				message: `${item.itemName} is not mapped to RxNorm. Map in RxNorm drug mapping admin.`
			});
			continue;
		}
		mappedRxcuis.push(rxcui);
	}

	const interactions = await findLocalDrugInteractions(mappedRxcuis);
	for (const hit of interactions) {
		alerts.push({
			alertType: 'drug_drug_interaction',
			severity: hit.severity,
			message: `[${hit.source}] ${hit.description}`,
			conceptRef: hit.externalId
		});
	}

	const lineIngredients: Array<{ itemName: string; rxcui: string }> = [];
	for (const item of items) {
		const rxcui = item.rxnormRxcui?.trim();
		if (!rxcui) continue;
		const ings = await expandOrderLineToIngredientRxcuis(rxcui);
		for (const ing of ings) {
			lineIngredients.push({ itemName: item.itemName, rxcui: ing });
		}
	}
	const ingCount = new Map<string, number>();
	for (const li of lineIngredients) {
		ingCount.set(li.rxcui, (ingCount.get(li.rxcui) ?? 0) + 1);
	}
	for (const [ingRxcui, count] of ingCount) {
		if (count < 2) continue;
		alerts.push({
			alertType: 'duplicate_ingredient',
			severity: PrescribingAlertSeverityEnum.MODERATE,
			message: `Duplicate ingredient RxCUI ${ingRxcui} on multiple order lines.`,
			conceptRef: ingRxcui
		});
	}

	const [visitRow] = await db
		.select({ patientId: table.patientVisitTable.patientId })
		.from(table.patientVisitTable)
		.where(eq(table.patientVisitTable.id, input.visitId))
		.limit(1);

	if (visitRow?.patientId != null) {
		const allergies = await db
			.select({
				allergyId: table.patientAllergyTable.allergyId,
				name: table.allergyTable.name
			})
			.from(table.patientAllergyTable)
			.innerJoin(
				table.allergyTable,
				eq(table.patientAllergyTable.allergyId, table.allergyTable.id)
			)
			.where(
				and(
					eq(table.patientAllergyTable.patientId, visitRow.patientId),
					eq(table.patientAllergyTable.statusId, StatusEnum.ACTIVE)
				)
			);

		const allergyMaps = allergies.length
			? await db
					.select()
					.from(table.allergyRxnormMapTable)
					.where(
						inArray(
							table.allergyRxnormMapTable.allergyId,
							allergies.map((a) => a.allergyId)
						)
					)
			: [];

		const allergyIngSet = new Set(allergyMaps.map((m) => m.ingredientRxcui));
		for (const a of allergies) {
			if (!allergyMaps.some((m) => m.allergyId === a.allergyId)) {
				const hits = await searchRxnormConcepts({
					query: a.name ?? '',
					limit: 1
				});
				const ing = hits.find((h) => h.tty === 'IN') ?? hits[0];
				if (ing) allergyIngSet.add(ing.rxcui);
			}
		}

		for (const li of lineIngredients) {
			if (allergyIngSet.has(li.rxcui)) {
				alerts.push({
					alertType: 'drug_allergy',
					severity: PrescribingAlertSeverityEnum.SEVERE,
					message: `Possible allergy match for ${li.itemName} (ingredient RxCUI ${li.rxcui}). Patient allergy on record.`,
					conceptRef: li.rxcui
				});
			}
		}
	}

	return persistPrescribingAlerts(input, alerts);
}

async function persistPrescribingAlerts(
	input: {
		hospitalId: string;
		visitId: string;
		staffId: string;
		batchId?: number | null;
	},
	allAlerts: ScreenAlert[]
): Promise<CdsScreenResult> {
	const db = ensureDb();
	const rows = await db
		.insert(table.prescribingAlertTable)
		.values(
			allAlerts.map((a) => ({
				hospitalId: input.hospitalId,
				visitId: input.visitId,
				batchId: input.batchId ?? null,
				alertType: a.alertType,
				severity: a.severity,
				message: a.message,
				conceptRef: a.conceptRef ?? null,
				createdBy: input.staffId
			}))
		)
		.returning();
	const hasBlocking = allAlerts.some(
		(a) => a.severity === PrescribingAlertSeverityEnum.SEVERE
	);
	return {
		alerts: rows.map((r) => ({
			id: r.id,
			alertType: r.alertType,
			severity: r.severity,
			message: r.message,
			overridden: r.overridden,
			batchId: r.batchId
		})),
		hasBlocking
	};
}

export async function overridePrescribingAlerts(input: {
	hospitalId: string;
	alertIds: number[];
	staffId: string;
	reasonCode: string;
	remark?: string;
}) {
	if (!input.alertIds.length) return;
	const db = ensureDb();
	await db
		.update(table.prescribingAlertTable)
		.set({
			overridden: true,
			overrideReasonCode: input.reasonCode,
			overrideRemark: input.remark ?? null,
			overriddenBy: input.staffId,
			overriddenAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.prescribingAlertTable.hospitalId, input.hospitalId),
				inArray(table.prescribingAlertTable.id, input.alertIds)
			)
		);
}
