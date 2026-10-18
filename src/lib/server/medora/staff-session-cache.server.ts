import { getStaffByUserIdWithRelations } from '$lib/server/medora/administration/staff.server';

const TTL_MS = 45_000;

type StaffRow = NonNullable<
	Awaited<ReturnType<typeof getStaffByUserIdWithRelations>>
>;

const byUserId = new Map<string, { at: number; staff: StaffRow }>();

/** Session staff with relations; short TTL to avoid a heavy join on every request. */
export async function getStaffByUserIdWithRelationsCached(
	userId: string
): Promise<StaffRow | null> {
	const now = Date.now();
	const hit = byUserId.get(userId);
	if (hit && now - hit.at < TTL_MS) return hit.staff;

	const staff = await getStaffByUserIdWithRelations(userId);
	if (staff) byUserId.set(userId, { at: now, staff });
	else byUserId.delete(userId);
	return staff ?? null;
}

export function invalidateStaffSessionCache(userId: string): void {
	byUserId.delete(userId);
}
