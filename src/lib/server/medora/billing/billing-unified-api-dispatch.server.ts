import type { RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import {
	billingApiSegmentForVisitType,
	type BillingApiSegment
} from '$lib/tool/billing/billing-api-segment.util';
import { parseUuid } from '$lib/util/id.util';

async function visitIdFromEvent(event: RequestEvent): Promise<string | null> {
	const fromQuery = parseUuid(event.url.searchParams.get('visitId'));
	if (fromQuery) return fromQuery;
	if (event.request.method === 'GET') return null;
	try {
		const body = (await event.request.clone().json()) as {
			visitId?: unknown;
		};
		return parseUuid(body.visitId);
	} catch {
		return null;
	}
}

/** Resolve OP / ER / IP billing API segment from the request visitId. */
export async function billingApiSegmentForRequest(
	event: RequestEvent
): Promise<BillingApiSegment> {
	const hospitalId = event.params.hospital_id ?? '';
	const visitId = await visitIdFromEvent(event);
	if (!hospitalId || !visitId) return 'op-billing';

	const db = ensureDb();
	const [visit] = await db
		.select({ visitTypeId: table.patientVisitTable.visitTypeId })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId)
			)
		)
		.limit(1);

	return billingApiSegmentForVisitType(visit?.visitTypeId ?? null);
}

/** OP and ER share the OP bills API; IP uses ip-billing bills. */
export function billingBillsApiSegment(
	segment: BillingApiSegment
): 'op-billing' | 'ip-billing' {
	return segment === 'ip-billing' ? 'ip-billing' : 'op-billing';
}
