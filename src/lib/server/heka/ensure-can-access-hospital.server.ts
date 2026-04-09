import { error, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';

/**
 * Authorization helper for "hospital-scoped" modules.
 *
 * - SYSTEM_ADMIN: always allowed
 * - OWNER: only for hospitals they own
 * - STAFF: only for hospitals in `event.locals.allowedHospitalIds`
 */
export async function ensureCanAccessHospital(
	event: RequestEvent,
	hospitalId: string,
	opts?: { ownerErrorMessage?: string }
): Promise<void> {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	if (!hospitalId) throw error(400, 'Hospital is required');

	const userRoleId = event.locals.userRoleId ?? null;
	const userId = event.locals.user?.id ?? null;
	const allowedHospitalIds = event.locals.allowedHospitalIds ?? [];

	if (userRoleId === RoleEnum.SYSTEM_ADMIN) return;

	if (userRoleId === RoleEnum.OWNER && userId) {
		const [h] = await ensureDb()
			.select({ ownerId: table.hospitalTable.ownerId })
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, hospitalId))
			.limit(1);
		if (!h || h.ownerId !== userId)
			throw error(
				403,
				opts?.ownerErrorMessage ??
					'You can only access data for your own hospitals'
			);
		return;
	}

	if (userRoleId === RoleEnum.STAFF) {
		if (!allowedHospitalIds.includes(hospitalId))
			throw error(403, 'You do not have access to this hospital');
		return;
	}

	throw error(403, 'Forbidden');
}

