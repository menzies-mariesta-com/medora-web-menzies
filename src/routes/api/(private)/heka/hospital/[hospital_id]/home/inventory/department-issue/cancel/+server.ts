import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelDepartmentIssue } from '$lib/server/heka/inventory/department-issue.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await cancelDepartmentIssue(event, {
		hospitalId,
		issueId: String(body.issueId ?? ''),
		reason: String(body.reason ?? '')
	});
	return json(data);
};

