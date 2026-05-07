import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approveDepartmentIndent } from '$lib/server/heka/inventory/department-indent.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await approveDepartmentIndent(event, {
		hospitalId,
		indentId: String(body.indentId ?? ''),
		action: Number(body.action ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null
	});
	return json(data);
};
