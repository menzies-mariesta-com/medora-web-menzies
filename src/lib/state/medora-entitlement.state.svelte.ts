/** Hospital workspace entitlement; set from hospital home layout. */
export const medoraEntitlementState = $state({
	ownerWorkspaceReadOnly: false
});

export function setMedoraEntitlementFromLayout(data: {
	ownerWorkspaceReadOnly?: boolean;
}): void {
	medoraEntitlementState.ownerWorkspaceReadOnly = Boolean(
		data.ownerWorkspaceReadOnly
	);
}
