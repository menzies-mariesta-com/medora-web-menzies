import { json, type RequestEvent } from '@sveltejs/kit';
import { RoleEnum } from '$lib/model/enum/db-link';
import { OwnerEntitlementPhaseEnum } from '$lib/model/enum/plan.enum';
import {
	extractHospitalIdFromMedoraApi,
	isOwnerApiReadOnlyViolation
} from '$lib/server/medora/plan/owner-api-read-only.policy';
import {
	getOwnerEntitlementSnapshot,
	getOwnerIdForHospital,
	resolveEntitlementPhaseForHospital
} from '$lib/server/medora/plan/owner-entitlement.server';
import {
	computeOwnerEntitlementPhase,
	isOwnerWorkspaceMutationsBlocked
} from '$lib/util/owner-entitlement-phase.util';

export {
	extractHospitalIdFromMedoraApi,
	isOwnerApiReadOnlyViolation,
	OWNER_READ_ONLY_WRITE_ALLOWLIST
} from '$lib/server/medora/plan/owner-api-read-only.policy';

export async function ownerApiReadOnlyResponseIfNeeded(
	event: RequestEvent
): Promise<Response | null> {
	const { request, locals, url } = event;
	if (!isOwnerApiReadOnlyViolation(request.method, url.pathname)) {
		return null;
	}
	if (url.pathname.startsWith('/api/medora/admin/')) {
		return null;
	}
	const roleId = locals.userRoleId;
	if (roleId === RoleEnum.SYSTEM_ADMIN) return null;

	let phase: OwnerEntitlementPhaseEnum;
	const hospitalId = extractHospitalIdFromMedoraApi(url.pathname);
	if (hospitalId) {
		phase = await resolveEntitlementPhaseForHospital(hospitalId);
	} else if (roleId === RoleEnum.OWNER && locals.user?.id) {
		const snap = await getOwnerEntitlementSnapshot(locals.user.id);
		phase = computeOwnerEntitlementPhase(snap).phase;
	} else if (roleId === RoleEnum.STAFF && locals.staff?.staffHospitals?.length) {
		const hid = (
			locals.staff.staffHospitals as { hospitalId: string }[]
		)[0]?.hospitalId;
		if (!hid) return null;
		const ownerId = await getOwnerIdForHospital(hid);
		if (!ownerId) return null;
		const snap = await getOwnerEntitlementSnapshot(ownerId);
		phase = computeOwnerEntitlementPhase(snap).phase;
	} else {
		return null;
	}

	if (!isOwnerWorkspaceMutationsBlocked(phase)) return null;

	return json(
		{
			message:
				'Your trial or subscription period has ended. This workspace is read-only.'
		},
		{ status: 405 }
	);
}
