import type { RequestHandler } from './$types';
import {
	billingApiSegmentForRequest,
	billingBillsApiSegment
} from '$lib/server/medora/billing/billing-unified-api-dispatch.server';
import {
	GET as ipGet,
	POST as ipPost
} from '../../ip-billing/bills/+server';
import {
	GET as opGet,
	POST as opPost
} from '../../op-billing/bills/+server';

export const GET: RequestHandler = async (event) => {
	const segment = await billingApiSegmentForRequest(event);
	if (billingBillsApiSegment(segment) === 'ip-billing') return ipGet(event);
	return opGet(event);
};

export const POST: RequestHandler = async (event) => {
	const segment = await billingApiSegmentForRequest(event);
	if (billingBillsApiSegment(segment) === 'ip-billing') return ipPost(event);
	return opPost(event);
};
