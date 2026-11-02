import type { RequestHandler } from './$types';
import { billingApiSegmentForRequest } from '$lib/server/medora/billing/billing-unified-api-dispatch.server';
import {
	GET as erGet,
	POST as erPost
} from '../../er-billing/visit-lines/+server';
import {
	GET as ipGet,
	POST as ipPost
} from '../../ip-billing/visit-lines/+server';
import {
	GET as opGet,
	POST as opPost
} from '../../op-billing/visit-lines/+server';

export const GET: RequestHandler = async (event) => {
	const segment = await billingApiSegmentForRequest(event);
	if (segment === 'ip-billing') return ipGet(event);
	if (segment === 'er-billing') return erGet(event);
	return opGet(event);
};

export const POST: RequestHandler = async (event) => {
	const segment = await billingApiSegmentForRequest(event);
	if (segment === 'ip-billing') return ipPost(event);
	if (segment === 'er-billing') return erPost(event);
	return opPost(event);
};
