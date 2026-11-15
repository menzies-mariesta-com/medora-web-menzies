import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import { userTable } from '$lib/server/db/table/auth-table/auth-table';

export const PLAN_REQUEST_EXISTING_USER_CODE = 'existing_user' as const;

export const PLAN_REQUEST_EXISTING_USER_MESSAGE =
	'This email is already registered with Medora. To change or add a plan, email menzies@mariesta.com.';

export async function emailExistsForPlanRequest(
	email: string
): Promise<boolean> {
	const normalized = email.trim().toLowerCase();
	const [row] = await ensureDb()
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.email, normalized))
		.limit(1);
	return Boolean(row);
}
