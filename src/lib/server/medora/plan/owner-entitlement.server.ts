import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import {
	ownerEntitlementTable,
	planRequestTable
} from '$lib/server/db/table/plan-table/plan-table';
import { hospitalTable } from '$lib/server/db/table/information-table/information-table';
import { userTable } from '$lib/server/db/table/auth-table/auth-table';
import {
	OwnerBillingModeEnum,
	OwnerEntitlementStatusEnum,
	type OwnerEntitlementPhaseEnum
} from '$lib/model/enum/plan.enum';
import type {
	OwnerEntitlementSnapshot,
	OwnerPlanListRow,
	PlanRequestListRow
} from '$lib/model/type/plan/owner-entitlement.type';
import {
	computeOwnerEntitlementPhase,
	trialEndsAtFromStart
} from '$lib/util/owner-entitlement-phase.util';

export async function getOwnerEntitlementSnapshot(
	ownerId: string
): Promise<OwnerEntitlementSnapshot | null> {
	const [row] = await ensureDb()
		.select({
			status: ownerEntitlementTable.status,
			startedAt: ownerEntitlementTable.startedAt,
			renewAt: ownerEntitlementTable.renewAt,
			endsAt: ownerEntitlementTable.endsAt,
			billingMode: ownerEntitlementTable.billingMode
		})
		.from(ownerEntitlementTable)
		.where(
			and(
				eq(ownerEntitlementTable.ownerId, ownerId),
				ne(
					ownerEntitlementTable.status,
					OwnerEntitlementStatusEnum.REMOVED
				)
			)
		)
		.orderBy(desc(ownerEntitlementTable.updatedAt))
		.limit(1);
	if (!row) return null;
	return {
		status: row.status as OwnerEntitlementStatusEnum,
		startedAt: row.startedAt,
		renewAt: row.renewAt,
		endsAt: row.endsAt,
		billingMode: row.billingMode as OwnerBillingModeEnum
	};
}

export async function getOwnerIdForHospital(
	hospitalId: string
): Promise<string | null> {
	const [row] = await ensureDb()
		.select({ ownerId: hospitalTable.ownerId })
		.from(hospitalTable)
		.where(eq(hospitalTable.id, hospitalId))
		.limit(1);
	return row?.ownerId ?? null;
}

export async function resolveEntitlementPhaseForHospital(
	hospitalId: string
): Promise<OwnerEntitlementPhaseEnum> {
	const ownerId = await getOwnerIdForHospital(hospitalId);
	if (!ownerId) {
		return computeOwnerEntitlementPhase(null).phase;
	}
	const snap = await getOwnerEntitlementSnapshot(ownerId);
	return computeOwnerEntitlementPhase(snap).phase;
}

export function buildTrialEndsAt(
	startedAt: string,
	trialDuration: string
): string {
	return trialEndsAtFromStart(startedAt, trialDuration);
}

export async function listPendingPlanRequests(): Promise<
	PlanRequestListRow[]
> {
	const rows = await ensureDb()
		.select()
		.from(planRequestTable)
		.where(eq(planRequestTable.status, 'pending'))
		.orderBy(desc(planRequestTable.createdAt));
	return rows.map((r) => ({
		id: r.id,
		requestKind: r.requestKind as PlanRequestListRow['requestKind'],
		pricingTier: r.pricingTier as PlanRequestListRow['pricingTier'],
		trialDuration: r.trialDuration,
		firstName: r.firstName,
		lastName: r.lastName,
		hospitalName: r.hospitalName,
		website: r.website,
		email: r.email,
		message: r.message,
		status: r.status as PlanRequestListRow['status'],
		createdAt: r.createdAt
	}));
}

export async function listActiveOwnerPlans(): Promise<OwnerPlanListRow[]> {
	const entitlements = await ensureDb()
		.select()
		.from(ownerEntitlementTable)
		.where(
			ne(
				ownerEntitlementTable.status,
				OwnerEntitlementStatusEnum.REMOVED
			)
		)
		.orderBy(desc(ownerEntitlementTable.updatedAt));
	if (entitlements.length === 0) return [];

	const ownerIds = [...new Set(entitlements.map((e) => e.ownerId))];
	const users = await ensureDb()
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email
		})
		.from(userTable)
		.where(inArray(userTable.id, ownerIds));
	const userById = new Map(users.map((u) => [u.id, u]));

	const hospitals = await ensureDb()
		.select({
			ownerId: hospitalTable.ownerId,
			name: hospitalTable.name
		})
		.from(hospitalTable)
		.where(inArray(hospitalTable.ownerId, ownerIds));
	const hospitalsByOwner = new Map<string, string[]>();
	for (const h of hospitals) {
		if (!h.ownerId) continue;
		const list = hospitalsByOwner.get(h.ownerId) ?? [];
		if (h.name) list.push(h.name);
		hospitalsByOwner.set(h.ownerId, list);
	}

	const seenOwner = new Set<string>();
	const out: OwnerPlanListRow[] = [];
	for (const e of entitlements) {
		if (seenOwner.has(e.ownerId)) continue;
		seenOwner.add(e.ownerId);
		const u = userById.get(e.ownerId);
		const snap: OwnerEntitlementSnapshot = {
			status: e.status as OwnerEntitlementStatusEnum,
			startedAt: e.startedAt,
			renewAt: e.renewAt,
			endsAt: e.endsAt,
			billingMode: e.billingMode as OwnerBillingModeEnum
		};
		const phase = computeOwnerEntitlementPhase(snap).phase;
		out.push({
			entitlementId: e.id,
			ownerId: e.ownerId,
			ownerName: u?.name ?? null,
			ownerEmail: u?.email ?? null,
			hospitalNames: hospitalsByOwner.get(e.ownerId) ?? [],
			pricingTier: e.pricingTier as OwnerPlanListRow['pricingTier'],
			billingMode: e.billingMode as OwnerBillingModeEnum,
			trialDuration: e.trialDuration,
			startedAt: e.startedAt,
			renewAt: e.renewAt,
			endsAt: e.endsAt,
			status: e.status as OwnerEntitlementStatusEnum,
			phase
		});
	}
	return out;
}
