import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDepartmentIssueFromIndent } from '$lib/server/heka/inventory/department-issue.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await createDepartmentIssueFromIndent(event, {
		hospitalId,
		indentId: String(body.indentId ?? ''),
		actingFromStoreId: Number(body.actingFromStoreId ?? 0)
	});
	return json(data);
};
