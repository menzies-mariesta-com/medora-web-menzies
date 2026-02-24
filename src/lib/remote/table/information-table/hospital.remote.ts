import { command, query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalSchema,
	HospitalSchemaInsert,
	HospitalSchemaUpdate
} from '$lib/server/db/schema-type';
import { eq } from 'drizzle-orm';
import { RoleEnum } from '$lib/model/enum/db-link';

// get all (for dropdowns and list)
export const getHospital = query(async (): Promise<HospitalSchema[]> => {
	const data = await ensureDb().select().from(table.hospitalTable);
	return data;
});

export type HospitalWithOwner = HospitalSchema & {
	owner?: { id: string; name: string | null; email: string } | null;
};

/** Hospitals with owner relation for list. Server enforces: OWNER only sees their hospitals; SYSTEM_ADMIN sees all. */
export const getHospitalWithOwner = query(
	'unchecked' as const,
	async (params?: { ownerId?: string | null }): Promise<HospitalWithOwner[]> => {
		const event = getRequestEvent();
		const userRoleId = event?.locals?.userRoleId ?? null;
		const userId = event?.locals?.user?.id ?? null;
		// OWNER: ignore client param and restrict to their hospitals
		const effectiveOwnerId =
			userRoleId === RoleEnum.OWNER && userId ? userId : params?.ownerId ?? undefined;
		return ensureDb().query.hospitalTable.findMany({
			with: {
				owner: {
					columns: { id: true, name: true, email: true },
				},
			},
			...(effectiveOwnerId != null && effectiveOwnerId !== '' && {
				where: (h, { eq }) => eq(h.ownerId, effectiveOwnerId),
			}),
		}) as Promise<HospitalWithOwner[]>;
	}
);

// get by id (for code generation, edit form, etc.)
export const getHospitalById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<HospitalSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, id));
		return row ?? null;
	}
);

export const createHospital = command(
	'unchecked' as const,
	async (input: HospitalSchemaInsert): Promise<HospitalSchema> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		const userRoleId = event.locals.userRoleId ?? null;
		const userId = event.locals.user.id;
		if (userRoleId === RoleEnum.STAFF) throw error(403, 'Staff cannot create hospitals');
		const values = { ...input };
		if (userRoleId === RoleEnum.OWNER) {
			values.ownerId = userId;
		}
		const [inserted] = await ensureDb()
			.insert(table.hospitalTable)
			.values(values)
			.returning();
		if (!inserted) throw new Error('Failed to create hospital');
		// Initialize per-hospital patient code counter
		await ensureDb().insert(table.hospitalPatientCodeCounterTable).values({
			hospitalId: inserted.id,
			lastNumber: 0
		});
		getHospital().refresh();
		getHospitalWithOwner(undefined).refresh();
		return inserted;
	}
);

export const updateHospital = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: HospitalSchemaUpdate & { id: string }): Promise<HospitalSchema> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		const userRoleId = event.locals.userRoleId ?? null;
		const userId = event.locals.user.id;
		if (userRoleId === RoleEnum.STAFF) throw error(403, 'Staff cannot update hospitals');
		if (userRoleId === RoleEnum.OWNER) {
			const [hospital] = await ensureDb()
				.select({ ownerId: table.hospitalTable.ownerId })
				.from(table.hospitalTable)
				.where(eq(table.hospitalTable.id, id))
				.limit(1);
			if (!hospital || hospital.ownerId !== userId) throw error(403, 'You can only update your own hospitals');
			data.ownerId = userId;
		}
		const [updated] = await ensureDb()
			.update(table.hospitalTable)
			.set(data)
			.where(eq(table.hospitalTable.id, id))
			.returning();
		if (!updated) throw new Error('Hospital not found');
		getHospital().refresh();
		getHospitalWithOwner(undefined).refresh();
		return updated;
	}
);

export const deleteHospital = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		const userRoleId = event.locals.userRoleId ?? null;
		const userId = event.locals.user.id;
		if (userRoleId === RoleEnum.STAFF) throw error(403, 'Staff cannot delete hospitals');
		if (userRoleId === RoleEnum.OWNER) {
			const [hospital] = await ensureDb()
				.select({ ownerId: table.hospitalTable.ownerId })
				.from(table.hospitalTable)
				.where(eq(table.hospitalTable.id, id))
				.limit(1);
			if (!hospital || hospital.ownerId !== userId) throw error(403, 'You can only delete your own hospitals');
		}
		await ensureDb().delete(table.hospitalTable).where(eq(table.hospitalTable.id, id));
		getHospital().refresh();
		getHospitalWithOwner(undefined).refresh();
	}
);
