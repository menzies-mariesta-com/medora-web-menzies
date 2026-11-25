import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { auth } from '$lib/auth/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	ownerEntitlementTable,
	planRequestTable
} from '$lib/server/db/table/plan-table/plan-table';
import {
	accountTable,
	userTable
} from '$lib/server/db/table/auth-table/auth-table';
import {
	AdminPageKeyEnum,
	RoleEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import {
	OwnerBillingModeEnum,
	OwnerEntitlementStatusEnum,
	PlanRequestStatusEnum,
	isPricingTier
} from '$lib/model/enum/plan.enum';
import { isTrialDuration } from '$lib/tool/pricing';
import { requireAdminPagePermission } from '$lib/server/medora/admin/admin-permission.server';
import { PasswordHashUtil } from '$lib/server/auth/password-hash.server';
import { uuidV7 } from '$lib/util/id.util';
import { toUtcIsoString } from '$lib/util/utc-instant.util';
import { buildTrialEndsAt } from '$lib/server/medora/plan/owner-entitlement.server';
import { DiagnosisCodingSystemEnum } from '$lib/model/enum/diagnosis-coding-system.enum';
import { beginPasswordResetUrlCapture } from '$lib/server/auth/capture-password-reset-url.server';
import {
	grantedEmailFieldsFromGrant,
	sendPlanDeclinedEmailForRequest,
	sendPlanGrantedEmail
} from '$lib/server/pricing/plan-decision-email.server';
import { resolveEmailAppOrigin } from '$lib/asset/email/email-brand';

function authOrigin(): string {
	return resolveEmailAppOrigin();
}

function generateRandomPassword(length = 16): string {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += charset.charAt(
			Math.floor(Math.random() * charset.length)
		);
	}
	return password;
}

async function ensureOwnerUser(
	email: string,
	displayName: string
): Promise<{ userId: string; created: boolean }> {
	const normalized = email.trim().toLowerCase();
	const [existing] = await ensureDb()
		.select()
		.from(userTable)
		.where(eq(userTable.email, normalized))
		.limit(1);
	if (existing) {
		if (existing.roleId !== RoleEnum.OWNER) {
			throw error(
				409,
				'An account with this email exists but is not an owner.'
			);
		}
		return { userId: existing.id, created: false };
	}

	const passwordHashUtil = new PasswordHashUtil();
	const hashedPassword = await passwordHashUtil.hash(
		generateRandomPassword(16)
	);
	const userId = uuidV7();
	const [user] = await ensureDb()
		.insert(userTable)
		.values({
			id: userId,
			name: displayName.trim(),
			email: normalized,
			emailVerified: false,
			roleId: RoleEnum.OWNER
		})
		.returning();
	if (!user) throw error(500, 'Failed to create owner.');
	await ensureDb().insert(accountTable).values({
		id: uuidV7(),
		userId: user.id,
		// better-auth 1.7 identifies the credential account by userId
		accountId: user.id,
		providerId: 'credential',
		password: hashedPassword
	});
	return { userId: user.id, created: true };
}

async function requestPasswordResetForEmail(email: string): Promise<boolean> {
	const origin = authOrigin();
	try {
		const res = await auth.api.requestPasswordReset({
			body: {
				email: email.trim().toLowerCase(),
				redirectTo: `${origin}/auth/reset-password`
			},
			headers: new Headers({
				'content-type': 'application/json',
				origin
			}),
			asResponse: true
		});
		return res.ok;
	} catch (err) {
		console.error('[plan] requestPasswordReset failed', err);
		return false;
	}
}

async function createHospitalForOwner(
	ownerId: string,
	request: {
		hospitalName: string;
		email: string;
		website: string | null;
	}
): Promise<string> {
	const [inserted] = await ensureDb()
		.insert(table.hospitalTable)
		.values({
			name: request.hospitalName,
			email: request.email,
			website: request.website,
			ownerId,
			statusId: StatusEnum.ACTIVE,
			codingSystem: DiagnosisCodingSystemEnum.ICD10
		})
		.returning({ id: table.hospitalTable.id });
	if (!inserted) throw error(500, 'Failed to create hospital');
	return inserted.id;
}

export type GrantPlanPayload = {
	requestId: string;
	pricingTier: string;
	billingMode: OwnerBillingModeEnum;
	trialDuration?: string | null;
	startedAt: string;
	renewAt?: string | null;
};

export async function grantPlanRequest(
	event: RequestEvent,
	payload: GrantPlanPayload
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'create');
	const adminUserId = event.locals.user?.id;
	if (!adminUserId) throw error(401, 'Unauthorized');

	const [req] = await ensureDb()
		.select()
		.from(planRequestTable)
		.where(
			and(
				eq(planRequestTable.id, payload.requestId),
				eq(planRequestTable.status, PlanRequestStatusEnum.PENDING)
			)
		)
		.limit(1);
	if (!req) throw error(404, 'Pending request not found');

	if (!isPricingTier(payload.pricingTier)) {
		throw error(400, 'Invalid pricing tier');
	}
	if (payload.billingMode === OwnerBillingModeEnum.TRIAL) {
		const dur = payload.trialDuration ?? req.trialDuration;
		if (!dur || !isTrialDuration(dur)) {
			throw error(400, 'Trial duration required');
		}
	} else if (!payload.renewAt) {
		throw error(400, 'Renew date required for paid plans');
	}

	const displayName = `${req.firstName} ${req.lastName}`.trim();
	const { userId: ownerId } = await ensureOwnerUser(
		req.email,
		displayName
	);

	const [existingHospital] = await ensureDb()
		.select({ id: table.hospitalTable.id })
		.from(table.hospitalTable)
		.where(eq(table.hospitalTable.ownerId, ownerId))
		.limit(1);
	if (!existingHospital) {
		await createHospitalForOwner(ownerId, {
			hospitalName: req.hospitalName,
			email: req.email,
			website: req.website
		});
	}

	const trialDur =
		payload.billingMode === OwnerBillingModeEnum.TRIAL
			? (payload.trialDuration ?? req.trialDuration)!
			: null;
	const endsAt =
		payload.billingMode === OwnerBillingModeEnum.TRIAL
			? buildTrialEndsAt(payload.startedAt, trialDur)
			: null;

	await ensureDb()
		.update(ownerEntitlementTable)
		.set({
			status: OwnerEntitlementStatusEnum.REMOVED,
			updatedBy: adminUserId,
			updatedAt: toUtcIsoString()
		})
		.where(
			and(
				eq(ownerEntitlementTable.ownerId, ownerId),
				eq(
					ownerEntitlementTable.status,
					OwnerEntitlementStatusEnum.ACTIVE
				)
			)
		);
	// shortcut: only retires ACTIVE rows; SUSPENDED/REVOKED history stays for audit

	await ensureDb().insert(ownerEntitlementTable).values({
		id: uuidV7(),
		ownerId,
		pricingTier: payload.pricingTier,
		billingMode: payload.billingMode,
		trialDuration: trialDur,
		startedAt: payload.startedAt,
		renewAt:
			payload.billingMode === OwnerBillingModeEnum.TRIAL
				? null
				: payload.renewAt ?? null,
		endsAt,
		status: OwnerEntitlementStatusEnum.ACTIVE,
		sourcePlanRequestId: req.id,
		createdBy: adminUserId,
		updatedBy: adminUserId
	});

	await ensureDb()
		.update(planRequestTable)
		.set({
			status: PlanRequestStatusEnum.GRANTED,
			resolvedAt: toUtcIsoString(),
			resolvedByUserId: adminUserId
		})
		.where(eq(planRequestTable.id, req.id));

	const origin = authOrigin();
	const loginUrl = `${origin}/auth/login`;
	let resetUrl: string | null = null;
	try {
		const capture = beginPasswordResetUrlCapture(req.email);
		void requestPasswordResetForEmail(req.email);
		resetUrl = await capture;
	} catch (err) {
		console.error('[plan] grant reset URL capture failed', err);
	}
	const mailFields = grantedEmailFieldsFromGrant(
		req,
		{
			pricingTier: payload.pricingTier,
			billingMode: payload.billingMode,
			trialDuration: trialDur,
			endsAt,
			renewAt:
				payload.billingMode === OwnerBillingModeEnum.TRIAL
					? null
					: payload.renewAt ?? null
		},
		{ resetUrl, loginUrl }
	);
	void sendPlanGrantedEmail(req.email, mailFields);
}

export async function ignorePlanRequest(
	event: RequestEvent,
	requestId: string
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'edit');
	const adminUserId = event.locals.user?.id;
	if (!adminUserId) throw error(401, 'Unauthorized');
	const [req] = await ensureDb()
		.select()
		.from(planRequestTable)
		.where(
			and(
				eq(planRequestTable.id, requestId),
				eq(planRequestTable.status, PlanRequestStatusEnum.PENDING)
			)
		)
		.limit(1);
	if (!req) return;

	await ensureDb()
		.update(planRequestTable)
		.set({
			status: PlanRequestStatusEnum.IGNORED,
			resolvedAt: toUtcIsoString(),
			resolvedByUserId: adminUserId
		})
		.where(eq(planRequestTable.id, requestId));

	void sendPlanDeclinedEmailForRequest(req, 'ignored');
}

export async function removePlanRequest(
	event: RequestEvent,
	requestId: string
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'delete');
	const adminUserId = event.locals.user?.id;
	if (!adminUserId) throw error(401, 'Unauthorized');
	const [req] = await ensureDb()
		.select()
		.from(planRequestTable)
		.where(eq(planRequestTable.id, requestId))
		.limit(1);
	if (!req) return;

	await ensureDb()
		.update(planRequestTable)
		.set({
			status: PlanRequestStatusEnum.REMOVED,
			resolvedAt: toUtcIsoString(),
			resolvedByUserId: adminUserId
		})
		.where(eq(planRequestTable.id, requestId));

	if (req.status === PlanRequestStatusEnum.PENDING) {
		void sendPlanDeclinedEmailForRequest(req, 'removed');
	}
}

export async function removeOwnerPlanAndAccount(
	event: RequestEvent,
	entitlementId: string
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'delete');
	if (!event.locals.user?.id) throw error(401, 'Unauthorized');

	const [entitlement] = await ensureDb()
		.select({ ownerId: ownerEntitlementTable.ownerId })
		.from(ownerEntitlementTable)
		.where(eq(ownerEntitlementTable.id, entitlementId))
		.limit(1);
	if (!entitlement) throw error(404, 'Entitlement not found');

	const [owner] = await ensureDb()
		.select({ id: userTable.id, email: userTable.email, roleId: userTable.roleId })
		.from(userTable)
		.where(eq(userTable.id, entitlement.ownerId))
		.limit(1);
	if (!owner) throw error(404, 'Owner not found');
	if (owner.roleId !== RoleEnum.OWNER) {
		throw error(409, 'Only owner accounts can be removed from active plans');
	}

	const ownerEmail = owner.email.trim().toLowerCase();
	await ensureDb().transaction(async (tx) => {
		await tx
			.update(table.hospitalTable)
			.set({ ownerId: null })
			.where(eq(table.hospitalTable.ownerId, owner.id));
		await tx
			.delete(planRequestTable)
			.where(eq(planRequestTable.email, ownerEmail));
		await tx.delete(userTable).where(eq(userTable.id, owner.id));
	});
}

export async function sendOwnerPasswordResetEmail(
	event: RequestEvent,
	entitlementId: string
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'edit');
	const [entitlement] = await ensureDb()
		.select({ ownerId: ownerEntitlementTable.ownerId })
		.from(ownerEntitlementTable)
		.where(eq(ownerEntitlementTable.id, entitlementId))
		.limit(1);
	if (!entitlement) throw error(404, 'Entitlement not found');
	const [owner] = await ensureDb()
		.select({ email: userTable.email })
		.from(userTable)
		.where(eq(userTable.id, entitlement.ownerId))
		.limit(1);
	if (!owner?.email) throw error(404, 'Owner not found');
	const ok = await requestPasswordResetForEmail(owner.email);
	if (!ok) throw error(502, 'Failed to send password reset email');
}

export async function setEntitlementStatus(
	event: RequestEvent,
	entitlementId: string,
	status: OwnerEntitlementStatusEnum
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'edit');
	const adminUserId = event.locals.user?.id;
	if (!adminUserId) throw error(401, 'Unauthorized');
	const [updated] = await ensureDb()
		.update(ownerEntitlementTable)
		.set({
			status,
			updatedBy: adminUserId,
			updatedAt: toUtcIsoString()
		})
		.where(eq(ownerEntitlementTable.id, entitlementId))
		.returning({ id: ownerEntitlementTable.id });
	if (!updated) throw error(404, 'Entitlement not found');
}

export async function patchEntitlementDates(
	event: RequestEvent,
	entitlementId: string,
	payload: {
		startedAt?: string;
		renewAt?: string | null;
		endsAt?: string | null;
	}
): Promise<void> {
	await requireAdminPagePermission(event, AdminPageKeyEnum.PLANS, 'edit');
	const adminUserId = event.locals.user?.id;
	if (!adminUserId) throw error(401, 'Unauthorized');
	const [row] = await ensureDb()
		.select()
		.from(ownerEntitlementTable)
		.where(eq(ownerEntitlementTable.id, entitlementId))
		.limit(1);
	if (!row) throw error(404, 'Entitlement not found');

	const startedAt = payload.startedAt ?? row.startedAt;
	let endsAt = payload.endsAt ?? row.endsAt;
	if (
		row.billingMode === OwnerBillingModeEnum.TRIAL &&
		row.trialDuration &&
		payload.startedAt &&
		!payload.endsAt
	) {
		endsAt = buildTrialEndsAt(startedAt, row.trialDuration);
	}

	await ensureDb()
		.update(ownerEntitlementTable)
		.set({
			startedAt,
			renewAt: payload.renewAt !== undefined ? payload.renewAt : row.renewAt,
			endsAt,
			updatedBy: adminUserId,
			updatedAt: toUtcIsoString()
		})
		.where(eq(ownerEntitlementTable.id, entitlementId));
}
