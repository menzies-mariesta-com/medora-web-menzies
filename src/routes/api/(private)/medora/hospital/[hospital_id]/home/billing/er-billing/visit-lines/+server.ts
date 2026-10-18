import type { RequestHandler } from './$types';
import { parseUuid } from '$lib/util/id.util';
import { assertEdVisitForHospital } from '$lib/server/medora/ed/ed-visit.server';
import { GET as opBillingGet, POST as opBillingPost } from '../../op-billing/visit-lines/+server';

async function assertEdVisitFromRequest(
	event: Parameters<RequestHandler>[0]
): Promise<void> {
	const hospitalId = event.params.hospital_id ?? '';
	if (!hospitalId) return;
	let visitId: string | null = parseUuid(
		event.url.searchParams.get('visitId')
	);
	if (!visitId && event.request.method === 'POST') {
		try {
			const body = (await event.request.clone().json()) as {
				visitId?: unknown;
			};
			visitId = parseUuid(body.visitId);
		} catch {
			visitId = null;
		}
	}
	if (visitId) {
		await assertEdVisitForHospital({ hospitalId, visitId });
	}
}

export const GET: RequestHandler = async (event) => {
	await assertEdVisitFromRequest(event);
	return opBillingGet(event);
};

export const POST: RequestHandler = async (event) => {
	await assertEdVisitFromRequest(event);
	return opBillingPost(event);
};
