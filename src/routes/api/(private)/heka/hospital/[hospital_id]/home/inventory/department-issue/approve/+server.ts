import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approveDepartmentIssue } from '$lib/server/heka/inventory/department-issue.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await approveDepartmentIssue(event, {
		hospitalId,
		issueId: String(body.issueId ?? ''),
		action: Number(body.action ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null
	});
	return json(data);
};

