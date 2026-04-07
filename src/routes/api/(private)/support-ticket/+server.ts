import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	isSupportTicketStatus,
	type SupportTicketStatusEnum
} from '$lib/model/enum/support-ticket-status.enum';
import {
	createSupportTicket,
	getAllSupportTicketsPaginated,
	getMySupportTicketsPaginated,
	getSupportTicketById,
	getSupportTicketSession,
	updateSupportTicket
} from '$lib/server/heka/support-ticket.server';

export const GET: RequestHandler = async (event) => {
	const op = event.url.searchParams.get('op') ?? '';

	if (op === 'session') {
		const session = await getSupportTicketSession(event);
		return json(session);
	}

	if (op === 'list') {
		const scope = event.url.searchParams.get('scope') ?? 'my';
		const page = Number(event.url.searchParams.get('page') ?? '1');
		const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
		const statusRaw = event.url.searchParams.get('status')?.trim() ?? '';
		const status = statusRaw && isSupportTicketStatus(statusRaw) ? statusRaw : undefined;

		if (scope === 'all') {
			const data = await getAllSupportTicketsPaginated(event, {
				page,
				pageSize,
				status
			});
			return json(data);
		}

		const data = await getMySupportTicketsPaginated(event, {
			page,
			pageSize,
			status
		});
		return json(data);
	}

	if (op === 'byId') {
		const id = Number(event.url.searchParams.get('id') ?? '0');
		const row = await getSupportTicketById(event, { id });
		return json(row);
	}

	return json({ message: 'Invalid op' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const created = await createSupportTicket(event, {
		subject: String(body.subject ?? ''),
		description: String(body.description ?? ''),
		priority: Number(body.priority ?? 2),
		hospitalId: body.hospitalId != null ? String(body.hospitalId) : null,
		contextUrl: body.contextUrl != null ? String(body.contextUrl) : null
	});
	return json(created);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const updated = await updateSupportTicket(event, {
		id: Number(body.id ?? 0),
		status:
			body.status === undefined
				? undefined
				: (String(body.status) as SupportTicketStatusEnum),
		assignedToUserId:
			body.assignedToUserId === undefined
				? undefined
				: body.assignedToUserId != null
					? String(body.assignedToUserId)
					: null,
		resolution:
			body.resolution === undefined
				? undefined
				: body.resolution != null
					? String(body.resolution)
					: null
	});
	return json(updated);
};

