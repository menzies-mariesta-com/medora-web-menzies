import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OwnerEntitlementStatusEnum } from '$lib/model/enum/plan.enum';
import {
	patchEntitlementDates,
	removeOwnerPlanAndAccount,
	sendOwnerPasswordResetEmail,
	setEntitlementStatus
} from '$lib/server/medora/plan/plan-admin.server';

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');
	const entitlementId = String(body.entitlementId ?? '');

	if (!entitlementId) throw error(400, 'entitlementId required');

	if (action === 'suspend') {
		await setEntitlementStatus(
			event,
			entitlementId,
			OwnerEntitlementStatusEnum.SUSPENDED
		);
		return json({ success: true });
	}
	if (action === 'revoke') {
		await setEntitlementStatus(
			event,
			entitlementId,
			OwnerEntitlementStatusEnum.REVOKED
		);
		return json({ success: true });
	}
	if (action === 'remove') {
		await removeOwnerPlanAndAccount(event, entitlementId);
		return json({ success: true });
	}
	if (action === 'send_password_reset') {
		await sendOwnerPasswordResetEmail(event, entitlementId);
		return json({ success: true });
	}
	if (action === 'patch_dates') {
		await patchEntitlementDates(event, entitlementId, {
			startedAt:
				body.startedAt != null ? String(body.startedAt) : undefined,
			renewAt:
				body.renewAt !== undefined
					? body.renewAt != null && body.renewAt !== ''
						? String(body.renewAt)
						: null
					: undefined,
			endsAt:
				body.endsAt !== undefined
					? body.endsAt != null && body.endsAt !== ''
						? String(body.endsAt)
						: null
					: undefined
		});
		return json({ success: true });
	}

	throw error(400, 'Unknown action');
};
