import { error, json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { parseVisitOpenModeFromBody } from '$lib/server/medora/billing/billing-bill-context.server';
import {
	getHospitalBillingSettingRow,
	getVisitOpenMode,
	parsePharmacyBillingServiceItemIdFromBody,
	patchHospitalBillingSettings
} from '$lib/server/medora/billing/hospital-billing-setting.server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

function hospitalIdFrom(params: { hospital_id?: string }): string {
	const hid = params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = hospitalIdFrom(event.params);
	await ensureCanAccessHospital(event, hospitalId);
	const row = await getHospitalBillingSettingRow(hospitalId);
	const visitOpenMode =
		row?.visitOpenMode ?? (await getVisitOpenMode(hospitalId));
	const pharmacyBillingServiceItemId =
		row?.pharmacyBillingServiceItemId ?? null;

	let pharmacyBillingServiceName: string | null = null;
	if (pharmacyBillingServiceItemId != null) {
		const [svc] = await ensureDb()
			.select({ name: table.serviceItemTable.serviceName })
			.from(table.serviceItemTable)
			.where(
				eq(table.serviceItemTable.id, pharmacyBillingServiceItemId)
			)
			.limit(1);
		pharmacyBillingServiceName = svc?.name?.trim() ?? null;
	}

	return json({
		visitOpenMode,
		pharmacyBillingServiceItemId,
		pharmacyBillingServiceName
	});
};

export const PATCH: RequestHandler = async (event) => {
	const hospitalId = hospitalIdFrom(event.params);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const visitOpenMode = parseVisitOpenModeFromBody(body);
	const pharmacyId = parsePharmacyBillingServiceItemIdFromBody(body);
	const saved = await patchHospitalBillingSettings({
		hospitalId,
		visitOpenMode,
		...(pharmacyId !== undefined
			? { pharmacyBillingServiceItemId: pharmacyId }
			: {})
	});

	let pharmacyBillingServiceName: string | null = null;
	if (saved.pharmacyBillingServiceItemId != null) {
		const [svc] = await ensureDb()
			.select({ name: table.serviceItemTable.serviceName })
			.from(table.serviceItemTable)
			.where(
				eq(table.serviceItemTable.id, saved.pharmacyBillingServiceItemId)
			)
			.limit(1);
		pharmacyBillingServiceName = svc?.name?.trim() ?? null;
	}

	return json({
		visitOpenMode: saved.visitOpenMode,
		pharmacyBillingServiceItemId: saved.pharmacyBillingServiceItemId,
		pharmacyBillingServiceName
	});
};
