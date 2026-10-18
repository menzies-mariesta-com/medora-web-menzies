import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	disableHospitalTemplate,
	enableHospitalTemplate,
	getHospitalDefaultLocale,
	listCatalogForHospital
} from '$lib/server/medora/document-master/hospital-document-template.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);

	const category = event.url.searchParams.get('category') ?? undefined;
	const search = event.url.searchParams.get('search') ?? undefined;
	const defaultLocale = await getHospitalDefaultLocale(hospitalId);
	const rows = await listCatalogForHospital({ hospitalId, category, search });
	return json({ rows, defaultLocale });
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Staff required');

	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');

	switch (action) {
		case 'enable':
			return json(
				await enableHospitalTemplate({
					hospitalId,
					catalogCode: String(body.catalogCode),
					locale: String(body.locale ?? 'en'),
					staffId: String(staffId),
					documentSettingId: body.documentSettingId
						? Number(body.documentSettingId)
						: null
				})
			);
		case 'disable':
			await disableHospitalTemplate({
				hospitalId,
				catalogCode: String(body.catalogCode)
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown action: ${action}`);
	}
}
