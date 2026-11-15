import { RoleEnum } from '$lib/model/enum/db-link';
import { OwnerEntitlementPhaseEnum } from '$lib/model/enum/plan.enum';
import {
	getOwnerEntitlementSnapshot,
	getOwnerIdForHospital
} from '$lib/server/medora/plan/owner-entitlement.server';
import {
	computeOwnerEntitlementPhase,
	isOwnerWorkspaceMutationsBlocked
} from '$lib/util/owner-entitlement-phase.util';

export type OwnerEntitlementLayoutFields = {
	entitlementPhase: OwnerEntitlementPhaseEnum | null;
	entitlementRibbonLabel: string | null;
	entitlementShowRibbon: boolean;
	ownerWorkspaceReadOnly: boolean;
};

export async function loadOwnerEntitlementLayoutFields(
	hospitalId: string,
	userRoleId: number | null
): Promise<OwnerEntitlementLayoutFields> {
	const empty: OwnerEntitlementLayoutFields = {
		entitlementPhase: null,
		entitlementRibbonLabel: null,
		entitlementShowRibbon: false,
		ownerWorkspaceReadOnly: false
	};
	if (!hospitalId || userRoleId === RoleEnum.SYSTEM_ADMIN) return empty;

	const ownerId = await getOwnerIdForHospital(hospitalId);
	if (!ownerId) return empty;

	const snap = await getOwnerEntitlementSnapshot(ownerId);
	const computed = computeOwnerEntitlementPhase(snap);
	return {
		entitlementPhase: computed.phase,
		entitlementRibbonLabel: computed.ribbonLabel,
		entitlementShowRibbon: computed.showRibbon,
		ownerWorkspaceReadOnly: isOwnerWorkspaceMutationsBlocked(
			computed.phase
		)
	};
}
