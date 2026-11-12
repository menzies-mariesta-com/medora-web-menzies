import { error } from '@sveltejs/kit';
import {
	BillingVisitOpenModeEnum,
	parseBillingVisitOpenMode
} from '$lib/model/enum/billing-visit-open-mode.enum';
import type { BillingBillContextResponse } from '$lib/model/type/medora/billing-context.type';
import { ensureDb } from '$lib/server/db';
import { syncSourceLinkedOpenBills } from '$lib/server/medora/billing/billing-lineage-sync.server';
import { getVisitOpenMode } from '$lib/server/medora/billing/hospital-billing-setting.server';
import {
	listPatientOpenBills,
	sumMoneyStrings
} from '$lib/server/medora/billing/patient-open-bill.server';
import * as table from '$lib/server/db/schema';
import { parseUuid } from '$lib/util/id.util';
import { and, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

export async function buildBillingBillContext(input: {
	hospitalId: string;
	patientId?: string | null;
	visitId?: string | null;
	/** When set, syncs open bills for visits linked via `source_visit_id` before listing. */
	syncActor?: { userId: string; staffId: string | null };
}): Promise<BillingBillContextResponse> {
	const hospitalId = input.hospitalId.trim();
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const db = ensureDb();
	let patientId = parseUuid(input.patientId);
	const visitId = parseUuid(input.visitId);

	if (!patientId && visitId) {
		const [v] = await db
			.select({ patientId: table.patientVisitTable.patientId })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, visitId),
					eq(table.patientVisitTable.hospitalId, hospitalId),
					ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
				)
			)
			.limit(1);
		patientId = v?.patientId ?? null;
	}

	const visitOpenMode = await getVisitOpenMode(hospitalId, db);

	if (!patientId) {
		return {
			visitOpenMode,
			patientId: null,
			openBills: [],
			openBillsGrandTotal: '0.00',
			suggestedVisitId: null
		};
	}

	if (visitId && input.syncActor) {
		await syncSourceLinkedOpenBills({
			hospitalId,
			visitId,
			userId: input.syncActor.userId,
			staffId: input.syncActor.staffId
		});
	}

	const openBills = await listPatientOpenBills({
		hospitalId,
		patientId,
		db
	});

	const openBillsGrandTotal = sumMoneyStrings(
		openBills.map((b) => b.draftTotal)
	);

	let suggestedVisitId: string | null = null;
	if (visitOpenMode === BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL) {
		if (openBills.length === 1) {
			suggestedVisitId = openBills[0]!.visitId;
		} else if (visitId && openBills.some((b) => b.visitId === visitId)) {
			suggestedVisitId = visitId;
		}
	}

	return {
		visitOpenMode,
		patientId,
		openBills,
		openBillsGrandTotal,
		suggestedVisitId
	};
}

export function parseVisitOpenModeFromBody(
	body: Record<string, unknown>
): BillingVisitOpenModeEnum {
	const raw = body.visitOpenMode ?? body.visit_open_mode;
	if (typeof raw === 'number') return parseBillingVisitOpenMode(raw);
	if (typeof raw === 'string') {
		const t = raw.trim().toUpperCase();
		if (t === 'MULTIPLE_VISIT_ONE_BILL' || t === 'MULTIPLE') {
			return BillingVisitOpenModeEnum.MULTIPLE_VISIT_ONE_BILL;
		}
		if (t === 'ONE_VISIT_ONE_BILL' || t === 'ONE') {
			return BillingVisitOpenModeEnum.ONE_VISIT_ONE_BILL;
		}
		const n = Number(raw);
		if (Number.isFinite(n)) return parseBillingVisitOpenMode(n);
	}
	throw error(400, 'visitOpenMode is invalid');
}
