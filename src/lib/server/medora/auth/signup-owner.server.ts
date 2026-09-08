import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffSchema } from '$lib/server/db/schema-type';
import { RoleEnum } from '$lib/model/enum/db-link';
import { eq } from 'drizzle-orm';

/**
 * Post Better Auth email signup: promote user to OWNER and create minimal staff row.
 * Idempotent guard: refuses if a staff profile already exists for this user.
 */
export async function completeOwnerSignupProfile(
	event: RequestEvent,
	payload: {
		firstName?: string | null;
		middleName?: string | null;
		lastName?: string | null;
		countryId?: number | null;
		genderId?: number | null;
		phonePrimary?: string | null;
	}
): Promise<StaffSchema> {
	const user = event.locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const existingStaff = await ensureDb().query.staffTable.findFirst({
		where: eq(table.staffTable.userId, user.id)
	});
	if (existingStaff) {
		throw error(400, 'Profile already exists');
	}

	await ensureDb()
		.update(table.userTable)
		.set({ roleId: RoleEnum.OWNER })
		.where(eq(table.userTable.id, user.id));

	const [row] = await ensureDb()
		.insert(table.staffTable)
		.values({
			userId: user.id,
			firstName: payload.firstName?.trim() || undefined,
			middleName: payload.middleName?.trim() || undefined,
			lastName: payload.lastName?.trim() || undefined,
			countryId: payload.countryId ?? undefined,
			genderId: payload.genderId ?? undefined,
			phonePrimary: payload.phonePrimary?.trim() || undefined
		})
		.returning();

	if (!row) throw error(400, 'Failed to create staff profile');
	return row;
}
