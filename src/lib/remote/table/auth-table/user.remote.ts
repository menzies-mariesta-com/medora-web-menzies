import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	UserSchema,
	UserSchemaUpdate
} from '$lib/server/db/table/auth-table/auth-table-schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getUser = query(async (): Promise<UserSchema[]> => {
	const data = await ensureDb().select().from(table.userTable);
	return data;
});

// get count
export const getUserCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.userTable);
	return row?.count ?? 0;
});

// get one
export const getUserById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<UserSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.userTable)
			.where(eq(table.userTable.id, id));
		return row ?? null;
	}
);

// get all with linked staff profile (1:1 via staff.userId)
export const getUserWithStaff = query(async () => {
	return ensureDb().query.userTable.findMany({
		with: {
			staff: true
		}
	});
});

// get one with linked staff profile
export const getUserByIdWithStaff = query(
	'unchecked' as const,
	async ({ id }: { id: string }) => {
		return ensureDb().query.userTable.findFirst({
			where: (user, { eq }) => eq(user.id, id),
			with: {
				staff: true
			}
		});
	}
);

// update (e.g. name, image, email, etc.)
export const updateUser = command(
	'unchecked' as const,
	async (payload: { id: string } & UserSchemaUpdate): Promise<UserSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.userTable)
			.set(rest as UserSchemaUpdate)
			.where(eq(table.userTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getUser().refresh();
		return row;
	}
);

// delete user completely (cascades to sessions/accounts via FK)
export const deleteUser = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb().delete(table.userTable).where(eq(table.userTable.id, id));
		getUser().refresh();
	}
);

