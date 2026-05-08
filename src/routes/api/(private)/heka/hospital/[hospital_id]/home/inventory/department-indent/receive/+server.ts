import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postDepartmentIndentReceive } from '$lib/server/heka/inventory/department-indent.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await postDepartmentIndentReceive(event, {
		hospitalId,
		indentId: String(body.indentId ?? '')
	});
	return json(data);
};
