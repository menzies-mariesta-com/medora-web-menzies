import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffSchema, StaffSchemaInsert, StaffSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';


// get all
export const getStaff = query(async (): Promise<StaffSchema[]> => {
	const data = await db.select().from(table.staffTable);
	return data;
});

// get all with many-to-many relations (hospitals, departments, roles, userGroups) and master lookups
export const getStaffWithRelations = query(async () => {
	return db.query.staffTable.findMany({
		with: {
			bloodType: true,
			gender: true,
			identityType: true,
			maritalStatus: true,
			specialization: true,
			status: true,
			staffHospitals: { with: { hospital: true } },
			staffDepartments: { with: { department: true } },
			staffUserGroups: { with: { userGroup: true } }
		}
	});
});

// get one with relations
export const getStaffByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: string }) => {
		return db.query.staffTable.findFirst({
			where: (staff, { eq }) => eq(staff.id, id),
			with: {
				bloodType: true,
				gender: true,
				identityType: true,
				maritalStatus: true,
				specialization: true,
				status: true,
				hospitals: { with: { hospital: true } },
				departments: { with: { department: true } },
				roles: { with: { role: true } },
				userGroups: { with: { userGroup: true } },

			}
		});
	}
);

// get count
export const getStaffCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffTable);
	return row?.count ?? 0;
});

// get one
export const getStaffById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<StaffSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffTable)
			.where(eq(table.staffTable.id, id));
		return row ?? null;
	}
);

export const getStaffByUserId = query(
	'unchecked' as const,
	async ({ userId }: { userId: string }): Promise<StaffSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffTable)
			.where(eq(table.staffTable.userId, userId));
		return row ?? null;
	}
);

// create with uniqueness check on userId (1:1 with Better Auth user)
export const createStaff = command(
	'unchecked' as const,
	async (payload: StaffSchemaInsert): Promise<StaffSchema> => {
		// Ensure userId is present and non-null for the 1:1 link
		if (!payload.userId) {
			throw new Error('userId is required to create staff profile');
		}

		// Enforce 1:1 constraint: a user can only have one staff profile
		const existing = await getStaffByUserId({ userId: payload.userId });
		if (existing) {
			throw new Error('Staff profile already exists');
		}

		const [row] = await db
			.insert(table.staffTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaff().refresh();
		return row;
	}
);

// update
export const updateStaff = command(
	'unchecked' as const,
	async (payload: { id: string } & StaffSchemaUpdate): Promise<StaffSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffTable)
			.set(rest as StaffSchemaUpdate)
			.where(eq(table.staffTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaff().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStaff = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await db
			.update(table.staffTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffTable.id, id));
		getStaff().refresh();
	}
);

// delete complete (hard)
export const deleteStaffComplete = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await db.delete(table.staffTable).where(eq(table.staffTable.id, id));
		getStaff().refresh();
	}
);
