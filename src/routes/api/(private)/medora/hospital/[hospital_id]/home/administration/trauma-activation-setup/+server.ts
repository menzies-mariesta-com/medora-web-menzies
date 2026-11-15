import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as setup from '$lib/server/medora/ed/trauma-activation-setup.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import { DAISYUI_DEFAULT_HEX } from '$lib/tool/color/color-daisyui-default.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const entity = event.url.searchParams.get('entity') ?? 'level';

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	if (entity === 'level') {
		return json(
			await setup.getTraumaLevelsPaginated({
				hospitalId,
				page,
				pageSize,
				name: event.url.searchParams.get('name') ?? undefined,
				statusId: Number.isFinite(statusId as number)
					? statusId
					: undefined
			})
		);
	}
	if (entity === 'milestone') {
		return json(
			await setup.getMilestonesPaginated({
				hospitalId,
				page,
				pageSize,
				statusId: Number.isFinite(statusId as number)
					? statusId
					: undefined
			})
		);
	}
	if (entity === 'team') {
		return json(
			await setup.getTeamRolesPaginated({
				hospitalId,
				page,
				pageSize,
				statusId: Number.isFinite(statusId as number)
					? statusId
					: undefined
			})
		);
	}
	throw error(400, 'Unknown entity');
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const entity = String(body.entity ?? 'level');

	if (entity === 'level') {
		const code = String(body.code ?? '').trim();
		const name = String(body.name ?? '').trim();
		if (!code || !name) throw error(400, 'Code and name are required');
		return json(
			await setup.createTraumaLevel({
				id: 0,
				hospitalId,
				code,
				name,
				description:
					body.description != null ? String(body.description) : null,
				color: DAISYUI_DEFAULT_HEX.error,
				sortOrder: Number(body.sortOrder ?? 0),
				statusId:
					body.statusId === StatusEnum.INACTIVE
						? StatusEnum.INACTIVE
						: StatusEnum.ACTIVE
			})
		);
	}
	if (entity === 'milestone') {
		return json(
			await setup.createMilestoneTemplate({
				hospitalId,
				code: String(body.code ?? '').trim(),
				label: String(body.label ?? '').trim(),
				sortOrder: Number(body.sortOrder ?? 0),
				statusId:
					body.statusId === StatusEnum.INACTIVE
						? StatusEnum.INACTIVE
						: StatusEnum.ACTIVE
			})
		);
	}
	if (entity === 'team') {
		return json(
			await setup.createTeamRole({
				hospitalId,
				code: String(body.code ?? '').trim(),
				label: String(body.label ?? '').trim(),
				sortOrder: Number(body.sortOrder ?? 0),
				statusId:
					body.statusId === StatusEnum.INACTIVE
						? StatusEnum.INACTIVE
						: StatusEnum.ACTIVE
			})
		);
	}
	throw error(400, 'Unknown entity');
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const entity = String(body.entity ?? 'level');
	const id = Number(body.id);
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');

	if (entity === 'level') {
		return json(
			await setup.updateTraumaLevel({
				id,
				hospitalId,
				code: body.code != null ? String(body.code).trim() : undefined,
				name: body.name != null ? String(body.name).trim() : undefined,
				description:
					body.description !== undefined
						? body.description != null
							? String(body.description)
							: null
						: undefined,
				sortOrder:
					body.sortOrder !== undefined
						? Number(body.sortOrder)
						: undefined,
				statusId:
					body.statusId !== undefined ? Number(body.statusId) : undefined
			})
		);
	}
	if (entity === 'milestone') {
		return json(
			await setup.updateMilestoneTemplate({
				id,
				hospitalId,
				code: body.code != null ? String(body.code).trim() : undefined,
				label: body.label != null ? String(body.label).trim() : undefined,
				sortOrder:
					body.sortOrder !== undefined
						? Number(body.sortOrder)
						: undefined,
				statusId:
					body.statusId !== undefined ? Number(body.statusId) : undefined
			})
		);
	}
	if (entity === 'team') {
		return json(
			await setup.updateTeamRole({
				id,
				hospitalId,
				code: body.code != null ? String(body.code).trim() : undefined,
				label: body.label != null ? String(body.label).trim() : undefined,
				sortOrder:
					body.sortOrder !== undefined
						? Number(body.sortOrder)
						: undefined,
				statusId:
					body.statusId !== undefined ? Number(body.statusId) : undefined
			})
		);
	}
	throw error(400, 'Unknown entity');
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const entity = event.url.searchParams.get('entity') ?? 'level';
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');

	if (entity === 'level') {
		await setup.deleteTraumaLevel({ id, hospitalId });
		return json({ ok: true });
	}
	if (entity === 'milestone') {
		await setup.deleteMilestoneTemplate({ id, hospitalId });
		return json({ ok: true });
	}
	if (entity === 'team') {
		await setup.deleteTeamRole({ id, hospitalId });
		return json({ ok: true });
	}
	throw error(400, 'Unknown entity');
}