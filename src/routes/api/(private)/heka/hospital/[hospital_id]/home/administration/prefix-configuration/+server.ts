import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createPrefixConfiguration,
	deletePrefixConfiguration,
	getPrefixConfigurationByHospital,
	updatePrefixConfiguration
} from '$lib/server/heka/administration/prefix-configuration.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const data = await getPrefixConfigurationByHospital(event, {
		hospitalId
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const data = await createPrefixConfiguration(event, {
		hospitalId,
		key: String(body.key ?? ''),
		description:
			body.description != null ? String(body.description) : null,
		format: (body.format ?? {}) as any,
		counterIncludeBranch: Number(body.counterIncludeBranch ?? 0),
		counterIncludeFinancialYear: Number(
			body.counterIncludeFinancialYear ?? 0
		),
		counterIncludeVisitType: Number(
			body.counterIncludeVisitType ?? 0
		),
		counterIncludeVisit: Number(body.counterIncludeVisit ?? 0)
	});
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const data = await updatePrefixConfiguration(event, {
		id: Number(body.id),
		key: body.key != null ? String(body.key) : undefined,
		description:
			body.description === undefined
				? undefined
				: body.description != null
					? String(body.description)
					: null,
		format:
			body.format === undefined
				? undefined
				: ((body.format ?? {}) as any),
		counterIncludeBranch:
			body.counterIncludeBranch === undefined
				? undefined
				: Number(body.counterIncludeBranch),
		counterIncludeFinancialYear:
			body.counterIncludeFinancialYear === undefined
				? undefined
				: Number(body.counterIncludeFinancialYear),
		counterIncludeVisitType:
			body.counterIncludeVisitType === undefined
				? undefined
				: Number(body.counterIncludeVisitType),
		counterIncludeVisit:
			body.counterIncludeVisit === undefined
				? undefined
				: Number(body.counterIncludeVisit)
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;
	await deletePrefixConfiguration(event, { id: Number(body.id) });
	return json({ ok: true });
};
