import { ensureDb } from '$lib/server/db';
import { patientPortalAuditTable } from '$lib/server/db/schema';
import { uuidV7 } from '$lib/util/id.util';

export async function writePatientPortalAudit(input: {
	userId: string;
	patientId: string;
	hospitalId: string;
	endpoint: string;
}): Promise<void> {
	await ensureDb()
		.insert(patientPortalAuditTable)
		.values({
			id: uuidV7(),
			userId: input.userId,
			patientId: input.patientId,
			hospitalId: input.hospitalId,
			endpoint: input.endpoint
		});
}
