import { error } from '@sveltejs/kit';
import type { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';
import {
	BillingVisitOpenModeEnum as Mode,
	parseBillingVisitOpenMode
} from '$lib/model/enum/billing-visit-open-mode.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export type PharmacyBillingServiceItemRef = {
	id: number;
	subCategoryId: number;
	serviceName: string | null;
};

export async function getVisitOpenMode(
	hospitalId: string,
	db: ReturnType<typeof ensureDb> = ensureDb()
): Promise<BillingVisitOpenModeEnum> {
	const row = await getHospitalBillingSettingRow(hospitalId, db);
	return row?.visitOpenMode ?? Mode.ONE_VISIT_ONE_BILL;
}

export async function getHospitalBillingSettingRow(
	hospitalId: string,
	db: ReturnType<typeof ensureDb> = ensureDb()
): Promise<{
	visitOpenMode: BillingVisitOpenModeEnum;
	pharmacyBillingServiceItemId: number | null;
} | null> {
	const hid = hospitalId.trim();
	if (!hid) return null;

	const [row] = await db
		.select({
			visitOpenMode: table.hospitalBillingSettingTable.visitOpenMode,
			pharmacyBillingServiceItemId:
				table.hospitalBillingSettingTable.pharmacyBillingServiceItemId
		})
		.from(table.hospitalBillingSettingTable)
		.where(eq(table.hospitalBillingSettingTable.hospitalId, hid))
		.limit(1);

	if (!row) return null;
	return {
		visitOpenMode: parseBillingVisitOpenMode(row.visitOpenMode),
		pharmacyBillingServiceItemId: row.pharmacyBillingServiceItemId
	};
}

export async function getPharmacyBillingServiceItemForHospital(
	hospitalId: string,
	db: ReturnType<typeof ensureDb> = ensureDb()
): Promise<PharmacyBillingServiceItemRef | null> {
	const hid = hospitalId.trim();
	if (!hid) return null;

	const settings = await getHospitalBillingSettingRow(hid, db);
	const serviceId = settings?.pharmacyBillingServiceItemId;
	if (serviceId == null) return null;

	const [svc] = await db
		.select({
			id: table.serviceItemTable.id,
			subCategoryId: table.serviceItemTable.subCategoryId,
			serviceName: table.serviceItemTable.serviceName,
			hospitalId: table.serviceItemTable.hospitalId,
			statusId: table.serviceItemTable.statusId
		})
		.from(table.serviceItemTable)
		.where(eq(table.serviceItemTable.id, serviceId))
		.limit(1);

	if (
		!svc ||
		svc.hospitalId !== hid ||
		svc.statusId !== StatusEnum.ACTIVE
	) {
		return null;
	}

	return {
		id: svc.id,
		subCategoryId: svc.subCategoryId,
		serviceName: svc.serviceName
	};
}

async function assertPharmacyBillingServiceItemForHospital(input: {
	hospitalId: string;
	serviceItemId: number | null;
}): Promise<number | null> {
	if (input.serviceItemId == null) return null;
	if (!Number.isFinite(input.serviceItemId) || input.serviceItemId <= 0) {
		throw error(400, 'Invalid pharmacy billing service item');
	}

	const [svc] = await ensureDb()
		.select({ id: table.serviceItemTable.id })
		.from(table.serviceItemTable)
		.where(
			and(
				eq(table.serviceItemTable.id, input.serviceItemId),
				eq(table.serviceItemTable.hospitalId, input.hospitalId),
				eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);

	if (!svc) {
		throw error(
			400,
			'Pharmacy billing service item not found or not active for this hospital'
		);
	}
	return svc.id;
}

export async function upsertVisitOpenMode(input: {
	hospitalId: string;
	visitOpenMode: BillingVisitOpenModeEnum;
}): Promise<BillingVisitOpenModeEnum> {
	const result = await patchHospitalBillingSettings({
		hospitalId: input.hospitalId,
		visitOpenMode: input.visitOpenMode
	});
	return result.visitOpenMode;
}

export async function patchHospitalBillingSettings(input: {
	hospitalId: string;
	visitOpenMode?: BillingVisitOpenModeEnum;
	pharmacyBillingServiceItemId?: number | null;
}): Promise<{
	visitOpenMode: BillingVisitOpenModeEnum;
	pharmacyBillingServiceItemId: number | null;
}> {
	const hid = input.hospitalId.trim();
	if (!hid) throw new Error('hospitalId is required');

	const db = ensureDb();
	const current = await getHospitalBillingSettingRow(hid, db);

	const visitOpenMode =
		input.visitOpenMode !== undefined
			? parseBillingVisitOpenMode(input.visitOpenMode)
			: (current?.visitOpenMode ?? Mode.ONE_VISIT_ONE_BILL);

	let pharmacyBillingServiceItemId =
		current?.pharmacyBillingServiceItemId ?? null;
	if (input.pharmacyBillingServiceItemId !== undefined) {
		pharmacyBillingServiceItemId =
			await assertPharmacyBillingServiceItemForHospital({
				hospitalId: hid,
				serviceItemId: input.pharmacyBillingServiceItemId
			});
	}

	await db
		.insert(table.hospitalBillingSettingTable)
		.values({
			hospitalId: hid,
			visitOpenMode,
			pharmacyBillingServiceItemId
		})
		.onConflictDoUpdate({
			target: table.hospitalBillingSettingTable.hospitalId,
			set: {
				visitOpenMode,
				pharmacyBillingServiceItemId
			}
		});

	return { visitOpenMode, pharmacyBillingServiceItemId };
}

export function parsePharmacyBillingServiceItemIdFromBody(
	body: Record<string, unknown>
): number | null | undefined {
	if (body.pharmacyBillingServiceItemId === undefined) return undefined;
	const raw = body.pharmacyBillingServiceItemId;
	if (raw === null || raw === '') return null;
	const n = Number(raw);
	if (!Number.isFinite(n)) {
		throw error(400, 'Invalid pharmacy billing service item');
	}
	return n;
}
