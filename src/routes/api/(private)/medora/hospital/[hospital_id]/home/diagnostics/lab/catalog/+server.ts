import { error, json, type RequestEvent } from '@sveltejs/kit';
import { LabServiceMapTargetTypeEnum } from '$lib/model/enum/diagnostics.enum';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as catalog from '$lib/server/medora/diagnostics/lab-catalog.server';

function hid(event: RequestEvent) {
	return event.params.hospital_id ?? '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hid(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'tests';
	if (mode === 'panels') {
		return json(await catalog.listLabPanels({ hospitalId }));
	}
	if (mode === 'serviceMaps') {
		return json(await catalog.listServiceTestMaps({ hospitalId }));
	}
	if (mode === 'services') {
		return json(await catalog.listLaboratoryServiceItems(hospitalId));
	}
	const section = event.url.searchParams.get('section') ?? undefined;
	return json(await catalog.listLabTests({ hospitalId, section }));
}

export async function POST(event: RequestEvent) {
	const hospitalId = hid(event);
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');

	switch (action) {
		case 'saveTest':
			return json(
				await catalog.saveLabTest(
					{
						id: body.id ? Number(body.id) : undefined,
						hospitalId,
						code: String(body.code ?? ''),
						name: String(body.name ?? ''),
						section: String(body.section ?? 'chemistry'),
						dataType: body.dataType ? String(body.dataType) : undefined,
						unit: body.unit != null ? String(body.unit) : null,
						loincCode: body.loincCode != null ? String(body.loincCode) : null,
						refRangeLow: body.refRangeLow != null ? String(body.refRangeLow) : null,
						refRangeHigh: body.refRangeHigh != null ? String(body.refRangeHigh) : null,
						refRangeText: body.refRangeText != null ? String(body.refRangeText) : null,
						criticalLow: body.criticalLow != null ? String(body.criticalLow) : null,
						criticalHigh: body.criticalHigh != null ? String(body.criticalHigh) : null
					},
					staffId
				)
			);
		case 'savePanel':
			return json(
				await catalog.saveLabPanel(
					{
						id: body.id ? Number(body.id) : undefined,
						hospitalId,
						code: String(body.code ?? ''),
						name: String(body.name ?? ''),
						section: String(body.section ?? 'chemistry'),
						memberTestIds: Array.isArray(body.memberTestIds)
							? body.memberTestIds.map((id) => Number(id))
							: []
					},
					staffId
				)
			);
		case 'saveServiceMap':
			return json(
				await catalog.saveServiceTestMap({
					hospitalId,
					serviceItemId: Number(body.serviceItemId),
					targetType: String(
						body.targetType ?? LabServiceMapTargetTypeEnum.TEST
					),
					targetId: Number(body.targetId)
				})
			);
		case 'deleteServiceMap':
			await catalog.deleteServiceTestMap({
				hospitalId,
				id: Number(body.id)
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown action: ${action}`);
	}
}
