import {
	afterGlobalMasterCatalogMutation,
	afterHospitalMasterCatalogMutation
} from '$lib/server/cache/on-master-mutation.server';

/** Fire-and-forget invalidation after hospital master writes (server modules + jobs). */
export function notifyHospitalMasterWrite(hospitalId: string): void {
	void afterHospitalMasterCatalogMutation(hospitalId);
}

/** Fire-and-forget after global lookup/status catalog changes. */
export function notifyGlobalMasterWrite(): void {
	void afterGlobalMasterCatalogMutation();
}