import { error, json, type RequestEvent } from '@sveltejs/kit';
import { SurgicalCaseStatusTaggingEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { savePacuAndCompleteCase } from '$lib/server/medora/perioperative/pacu-handoff.server';
import { saveProcedureLogForCase } from '$lib/server/medora/perioperative/procedure-log.server';
import * as surgicalCase from '$lib/server/medora/perioperative/surgical-case.server';

function parseUuid(value: unknown, name: string): string {
	const s = String(value ?? '').trim();
	if (!s) throw error(400, `${name} is required`);
	return s;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'detail') {
		const id = Number(event.url.searchParams.get('id'));
		if (!Number.isFinite(id)) throw error(400, 'id is required');
		return json(
			await surgicalCase.getSurgicalCaseById({ hospitalId, id })
		);
	}
	if (mode === 'audit') {
		const caseId = Number(event.url.searchParams.get('caseId'));
		return json(
			await surgicalCase.listCaseAudit({ hospitalId, caseId })
		);
	}
	if (mode === 'implants') {
		const caseId = Number(event.url.searchParams.get('caseId'));
		return json(
			await surgicalCase.listCaseImplants({ hospitalId, caseId })
		);
	}
	return json(
		await surgicalCase.listSurgicalCases({
			hospitalId,
			branchId: event.url.searchParams.get('branchId'),
			date: event.url.searchParams.get('date') ?? undefined,
			otRoomId: event.url.searchParams.get('otRoomId')
				? Number(event.url.searchParams.get('otRoomId'))
				: undefined,
			statusTaggingId: event.url.searchParams.get('statusTaggingId')
				? Number(event.url.searchParams.get('statusTaggingId'))
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? 'save');

	if (action === 'create') {
		return json(
			await surgicalCase.createSurgicalCase({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				procedureName: String(body.procedureName ?? ''),
				caseType: body.caseType ? String(body.caseType) : undefined,
				priority: body.priority ? String(body.priority) : undefined,
				serviceOrderDetailId:
					body.serviceOrderDetailId != null
						? Number(body.serviceOrderDetailId)
						: null,
				staffId
			})
		);
	}
	if (action === 'schedule') {
		return json(
			await surgicalCase.scheduleSurgicalCase({
				hospitalId,
				caseId: Number(body.caseId),
				otRoomId: Number(body.otRoomId),
				scheduledStart: String(body.scheduledStart),
				scheduledEnd: String(body.scheduledEnd),
				staffId,
				bumpMode: body.bumpMode as 'none' | 'add_on' | 'bump' | undefined
			})
		);
	}
	if (action === 'pre_op_complete') {
		return json(
			await surgicalCase.markPreOpComplete({
				hospitalId,
				caseId: Number(body.caseId),
				staffId
			})
		);
	}
	if (action === 'status') {
		return json(
			await surgicalCase.updateCaseStatus({
				hospitalId,
				caseId: Number(body.caseId),
				statusTaggingId: Number(body.statusTaggingId),
				staffId,
				actualStart: body.actualStart
					? String(body.actualStart)
					: null,
				actualEnd: body.actualEnd ? String(body.actualEnd) : null
			})
		);
	}
	if (action === 'in_or') {
		return json(
			await surgicalCase.updateCaseStatus({
				hospitalId,
				caseId: Number(body.caseId),
				statusTaggingId: SurgicalCaseStatusTaggingEnum.IN_OR,
				staffId,
				actualStart: new Date().toISOString()
			})
		);
	}
	if (action === 'in_pacu') {
		return json(
			await surgicalCase.updateCaseStatus({
				hospitalId,
				caseId: Number(body.caseId),
				statusTaggingId: SurgicalCaseStatusTaggingEnum.IN_PACU,
				staffId,
				actualEnd: new Date().toISOString()
			})
		);
	}
	if (action === 'pacu_complete') {
		return json(
			await savePacuAndCompleteCase({
				hospitalId,
				caseId: Number(body.caseId),
				visitId: parseUuid(body.visitId, 'visitId'),
				valuesJson:
					(body.valuesJson as Record<string, unknown>) ?? {},
				staffId: staffId ?? ''
			})
		);
	}
	if (action === 'add_implant') {
		return json(
			await surgicalCase.addCaseImplant({
				hospitalId,
				caseId: Number(body.caseId),
				itemBatchId:
					body.itemBatchId != null
						? Number(body.itemBatchId)
						: null,
				udiRaw: body.udiRaw ? String(body.udiRaw) : null,
				quantity: body.quantity ? String(body.quantity) : '1'
			})
		);
	}
	if (action === 'procedure_log') {
		return json(
			await saveProcedureLogForCase({
				hospitalId,
				caseId: Number(body.caseId),
				valuesJson:
					(body.valuesJson as Record<string, unknown>) ?? {},
				staffId,
				sign: Boolean(body.sign)
			})
		);
	}
	throw error(400, 'Unknown action');
}
