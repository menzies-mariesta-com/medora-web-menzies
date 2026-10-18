import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as orderSet from '$lib/server/medora/clinical/order-set.server';
import * as formulary from '$lib/server/medora/clinical/formulary.server';
import * as rxnormMap from '$lib/server/medora/clinical/rxnorm/rxnorm-drug-mapping.server';
import * as rxnormCatalog from '$lib/server/medora/clinical/rxnorm/rxnorm-catalog.server';
import * as productId from '$lib/server/medora/clinical/pharmacy-product-identifier.server';
import * as carePlan from '$lib/server/medora/clinical/nursing-care-plan.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? '';
	switch (mode) {
		case 'orderSet.list':
			return json(await orderSet.listOrderSets(hospitalId));
		case 'orderSet.get': {
			const id = Number(event.url.searchParams.get('id') ?? 0);
			return json(await orderSet.getOrderSetWithLines({ hospitalId, orderSetId: id }));
		}
		case 'formulary.list':
			return json(await formulary.listFormularyItems(hospitalId));
		case 'formulary.substitutions':
			return json(await formulary.listSubstitutionRules(hospitalId));
		case 'rxnorm.items':
			return json(
				await rxnormMap.listItemsForRxnormMapping({
					hospitalId,
					search: event.url.searchParams.get('search') ?? undefined
				})
			);
		case 'rxnorm.search':
			return json(
				await rxnormCatalog.searchRxnormConcepts({
					query: event.url.searchParams.get('q') ?? '',
					limit: Number(event.url.searchParams.get('limit') ?? 25)
				})
			);
		case 'rxnorm.ingredients': {
			const rxcui = event.url.searchParams.get('rxcui') ?? '';
			return json(await rxnormCatalog.getIngredientsForRxcui(rxcui));
		}
		case 'rxnorm.importStatus':
			return json(await rxnormCatalog.getRxnormImportStatus());
		case 'productIdentifier.list':
			return json(await productId.listPharmacyProductIdentifiers(hospitalId));
		case 'carePlanTemplate.list':
			return json(await carePlan.listCarePlanTemplates(hospitalId));
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const mode = String(body.mode ?? '');
	switch (mode) {
		case 'orderSet.save':
			return json({
				id: await orderSet.saveOrderSet({
					hospitalId,
					id: body.id ? Number(body.id) : undefined,
					name: String(body.name ?? ''),
					specialtyTag: body.specialtyTag != null ? String(body.specialtyTag) : null,
					lines: (body.lines as {
						lineNo: number;
						lineType: string;
						payloadJson: Record<string, unknown>;
					}[]) ?? []
				})
			});
		case 'orderSet.delete':
			await orderSet.deleteOrderSet({
				hospitalId,
				id: Number(body.id ?? 0)
			});
			return json({ ok: true });
		case 'formulary.upsert':
			return json({
				id: await formulary.upsertFormularyItem({
					hospitalId,
					itemMasterId: Number(body.itemMasterId ?? 0),
					tier: String(body.tier ?? 'preferred')
				})
			});
		case 'formulary.substitution.save':
			return json({
				id: await formulary.saveSubstitutionRule({
					hospitalId,
					restrictedItemMasterId: Number(body.restrictedItemMasterId ?? 0),
					preferredItemMasterId: Number(body.preferredItemMasterId ?? 0)
				})
			});
		case 'rxnorm.setItemMapping':
			await rxnormMap.setItemRxnormMapping({
				hospitalId,
				itemMasterId: Number(body.itemMasterId ?? 0),
				rxnormRxcui:
					body.rxnormRxcui != null && String(body.rxnormRxcui).trim()
						? String(body.rxnormRxcui).trim()
						: null
			});
			return json({ ok: true });
		case 'productIdentifier.save':
			return json(
				await productId.savePharmacyProductIdentifier({
					hospitalId,
					itemMasterId: Number(body.itemMasterId ?? 0),
					barcodeValue: String(body.barcodeValue ?? ''),
					identifierType: String(body.identifierType ?? 'hospital'),
					isPrimary: Boolean(body.isPrimary)
				})
			);
		case 'productIdentifier.delete':
			await productId.deletePharmacyProductIdentifier({
				hospitalId,
				id: Number(body.id ?? 0)
			});
			return json({ ok: true });
		case 'carePlanTemplate.save':
			return json({
				id: await carePlan.saveCarePlanTemplate({
					hospitalId,
					id: body.id ? Number(body.id) : undefined,
					title: String(body.title ?? ''),
					nandaLabel:
						body.nandaLabel != null ? String(body.nandaLabel) : null,
					sectionsJson: (body.sectionsJson as unknown[]) ?? []
				})
			});
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
