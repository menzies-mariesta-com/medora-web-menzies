import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess
} from '$lib/server/heka/inventory/inventory-scope.server';

export type StockAlertSettingsDto = {
	hospitalId: string;
	defaultExpiringSoonDays: number;
	emailLowStock: boolean;
	emailExpired: boolean;
	emailExpiringSoon: boolean;
	emailMinGapMinutes: number;
	inAppMinGapMinutes: number;
};

export type StockAlertRecipientDto = {
	storeId: number;
	storeName: string | null;
	staffId: string;
	firstName: string | null;
	middleName: string | null;
	lastName: string | null;
	code: string | null;
	notifyLowStock: boolean;
	notifyExpired: boolean;
	notifyExpiringSoon: boolean;
};

const SETTINGS_FALLBACK: Omit<StockAlertSettingsDto, 'hospitalId'> = {
	defaultExpiringSoonDays: 30,
	emailLowStock: false,
	emailExpired: false,
	emailExpiringSoon: false,
	emailMinGapMinutes: 360,
	inAppMinGapMinutes: 360
};

export async function getDefaultExpiringSoonDaysForHospital(
	hospitalId: string
): Promise<number> {
	const [row] = await ensureDb()
		.select({
			defaultExpiringSoonDays:
				table.invStockAlertSettingTable.defaultExpiringSoonDays
		})
		.from(table.invStockAlertSettingTable)
		.where(eq(table.invStockAlertSettingTable.hospitalId, hospitalId))
		.limit(1);
	const d = row?.defaultExpiringSoonDays;
	return typeof d === 'number' && Number.isFinite(d)
		? Math.min(365, Math.max(1, d))
		: SETTINGS_FALLBACK.defaultExpiringSoonDays;
}

/** Loads persisted settings merged with defaults (no auth). */
export async function loadStockAlertSettingsEffectiveDb(
	hospitalId: string
): Promise<StockAlertSettingsDto> {
	const [row] = await ensureDb()
		.select()
		.from(table.invStockAlertSettingTable)
		.where(eq(table.invStockAlertSettingTable.hospitalId, hospitalId))
		.limit(1);
	if (!row) {
		return { hospitalId, ...SETTINGS_FALLBACK };
	}
	return {
		hospitalId,
		defaultExpiringSoonDays: Math.min(
			365,
			Math.max(1, row.defaultExpiringSoonDays)
		),
		emailLowStock: row.emailLowStock,
		emailExpired: row.emailExpired,
		emailExpiringSoon: row.emailExpiringSoon,
		emailMinGapMinutes: Math.max(1, row.emailMinGapMinutes),
		inAppMinGapMinutes: Math.max(1, row.inAppMinGapMinutes)
	};
}

export async function getStockAlertSettingsBundle(
	event: RequestEvent,
	hospitalId: string
): Promise<{
	settings: StockAlertSettingsDto;
	recipients: StockAlertRecipientDto[];
}> {
	await ensureHospitalInventoryAccess(event, hospitalId);
	const settings =
		await loadStockAlertSettingsEffectiveDb(hospitalId);
	const recipients = await listStockAlertRecipientsDb(hospitalId);
	return { settings, recipients };
}

/** Compact rows for notification dispatch (no auth). */
export async function listActiveStockAlertRecipientSubscriptions(
	hospitalId: string
): Promise<
	{
		storeId: number;
		storeName: string | null;
		staffId: string;
		notifyLowStock: boolean;
		notifyExpired: boolean;
		notifyExpiringSoon: boolean;
	}[]
> {
	const rows = await ensureDb()
		.select({
			storeId: table.invStockAlertRecipientTable.storeId,
			storeName: table.storeTable.storeName,
			staffId: table.invStockAlertRecipientTable.staffId,
			notifyLowStock:
				table.invStockAlertRecipientTable.notifyLowStock,
			notifyExpired: table.invStockAlertRecipientTable.notifyExpired,
			notifyExpiringSoon:
				table.invStockAlertRecipientTable.notifyExpiringSoon
		})
		.from(table.invStockAlertRecipientTable)
		.innerJoin(
			table.storeTable,
			eq(
				table.invStockAlertRecipientTable.storeId,
				table.storeTable.id
			)
		)
		.innerJoin(
			table.staffTable,
			eq(
				table.invStockAlertRecipientTable.staffId,
				table.staffTable.id
			)
		)
		.where(
			and(
				eq(table.invStockAlertRecipientTable.hospitalId, hospitalId),
				isNull(table.invStockAlertRecipientTable.deletedAt),
				eq(table.staffTable.statusId, StatusEnum.ACTIVE),
				sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
			)
		);
	return rows;
}

async function listStockAlertRecipientsDb(
	hospitalId: string
): Promise<StockAlertRecipientDto[]> {
	const rows = await ensureDb()
		.select({
			storeId: table.invStockAlertRecipientTable.storeId,
			storeName: table.storeTable.storeName,
			staffId: table.invStockAlertRecipientTable.staffId,
			notifyLowStock:
				table.invStockAlertRecipientTable.notifyLowStock,
			notifyExpired: table.invStockAlertRecipientTable.notifyExpired,
			notifyExpiringSoon:
				table.invStockAlertRecipientTable.notifyExpiringSoon,
			firstName: table.staffTable.firstName,
			middleName: table.staffTable.middleName,
			lastName: table.staffTable.lastName,
			code: table.staffTable.code
		})
		.from(table.invStockAlertRecipientTable)
		.innerJoin(
			table.storeTable,
			eq(
				table.invStockAlertRecipientTable.storeId,
				table.storeTable.id
			)
		)
		.innerJoin(
			table.staffTable,
			eq(
				table.invStockAlertRecipientTable.staffId,
				table.staffTable.id
			)
		)
		.where(
			and(
				eq(table.invStockAlertRecipientTable.hospitalId, hospitalId),
				isNull(table.invStockAlertRecipientTable.deletedAt),
				eq(table.staffTable.statusId, StatusEnum.ACTIVE),
				sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
			)
		)
		.orderBy(
			asc(table.storeTable.storeName),
			asc(table.staffTable.code)
		);

	return rows.map((r) => ({
		storeId: r.storeId,
		storeName: r.storeName,
		staffId: r.staffId,
		firstName: r.firstName,
		middleName: r.middleName,
		lastName: r.lastName,
		code: r.code,
		notifyLowStock: r.notifyLowStock,
		notifyExpired: r.notifyExpired,
		notifyExpiringSoon: r.notifyExpiringSoon
	}));
}

export async function upsertStockAlertSettings(
	event: RequestEvent,
	input: {
		hospitalId: string;
		defaultExpiringSoonDays: number;
		emailLowStock: boolean;
		emailExpired: boolean;
		emailExpiringSoon: boolean;
		emailMinGapMinutes: number;
		inAppMinGapMinutes: number;
	}
): Promise<StockAlertSettingsDto> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const days = Math.min(
		365,
		Math.max(1, Math.floor(input.defaultExpiringSoonDays))
	);
	const emailGap = Math.max(1, Math.floor(input.emailMinGapMinutes));
	const inAppGap = Math.max(1, Math.floor(input.inAppMinGapMinutes));

	await ensureDb()
		.insert(table.invStockAlertSettingTable)
		.values({
			hospitalId: input.hospitalId,
			defaultExpiringSoonDays: days,
			emailLowStock: input.emailLowStock,
			emailExpired: input.emailExpired,
			emailExpiringSoon: input.emailExpiringSoon,
			emailMinGapMinutes: emailGap,
			inAppMinGapMinutes: inAppGap
		})
		.onConflictDoUpdate({
			target: table.invStockAlertSettingTable.hospitalId,
			set: {
				defaultExpiringSoonDays: days,
				emailLowStock: input.emailLowStock,
				emailExpired: input.emailExpired,
				emailExpiringSoon: input.emailExpiringSoon,
				emailMinGapMinutes: emailGap,
				inAppMinGapMinutes: inAppGap,
				updatedAt: sql`now()`
			}
		});

	return loadStockAlertSettingsEffectiveDb(input.hospitalId);
}

export async function replaceStockAlertRecipients(
	event: RequestEvent,
	input: {
		hospitalId: string;
		recipients: {
			storeId: number;
			staffId: string;
			notifyLowStock: boolean;
			notifyExpired: boolean;
			notifyExpiringSoon: boolean;
		}[];
	}
): Promise<StockAlertRecipientDto[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const hid = input.hospitalId;
	const ids = [
		...new Set(input.recipients.map((r) => r.staffId).filter(Boolean))
	];
	if (ids.length === 0) {
		await ensureDb()
			.update(table.invStockAlertRecipientTable)
			.set({
				deletedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
			.where(
				and(
					eq(table.invStockAlertRecipientTable.hospitalId, hid),
					isNull(table.invStockAlertRecipientTable.deletedAt)
				)
			);
		return listStockAlertRecipientsDb(hid);
	}

	const eligible = await ensureDb()
		.select({ staffId: table.staffHospitalTable.staffId })
		.from(table.staffHospitalTable)
		.where(
			and(
				eq(table.staffHospitalTable.hospitalId, hid),
				inArray(table.staffHospitalTable.staffId, ids)
			)
		);
	const eligibleSet = new Set(eligible.map((e) => e.staffId));
	const filtered = input.recipients.filter((r) =>
		eligibleSet.has(r.staffId)
	);
	if (filtered.length !== input.recipients.length) {
		throw error(
			400,
			'One or more staff are not assigned to this hospital.'
		);
	}
	const seenPair = new Set<string>();
	const uniqueRecipients: typeof filtered = [];
	for (const r of filtered) {
		const sid = Math.floor(Number(r.storeId));
		if (!Number.isFinite(sid) || sid <= 0) {
			throw error(400, 'Invalid store for a recipient row.');
		}
		await assertStoreInHospital(hid, sid);
		const k = `${sid}:${r.staffId}`;
		if (seenPair.has(k)) continue;
		seenPair.add(k);
		uniqueRecipients.push({ ...r, storeId: sid });
	}

	const now = new Date().toISOString();
	await ensureDb().transaction(async (tx) => {
		await tx
			.update(table.invStockAlertRecipientTable)
			.set({ deletedAt: now, updatedAt: now })
			.where(
				and(
					eq(table.invStockAlertRecipientTable.hospitalId, hid),
					isNull(table.invStockAlertRecipientTable.deletedAt)
				)
			);

		if (uniqueRecipients.length > 0) {
			await tx.insert(table.invStockAlertRecipientTable).values(
				uniqueRecipients.map((r) => ({
					hospitalId: hid,
					storeId: r.storeId,
					staffId: r.staffId,
					notifyLowStock: r.notifyLowStock,
					notifyExpired: r.notifyExpired,
					notifyExpiringSoon: r.notifyExpiringSoon
				}))
			);
		}
	});

	return listStockAlertRecipientsDb(hid);
}
