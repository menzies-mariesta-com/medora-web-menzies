import { error, json, type RequestHandler } from '@sveltejs/kit';
import type { BillingSetupCareSettingEnum } from '$lib/model/enum/billing-setup-care-setting.enum';
import {
	linkBillingSetupServiceTaggings,
	listAvailableServiceTaggingsForBillingSetup,
	listBillingSetupLinksPaginated,
	unlinkBillingSetupLink,
	type BillingSetupTaggingQueryFilters
} from '$lib/server/medora/administration/billing-setup/billing-setup-service-tagging.server';

function parseNumberOrNull(value: string | null): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function parseTaggingFilters(
	searchParams: URLSearchParams
): BillingSetupTaggingQueryFilters {
	const taggingId = parseNumberOrNull(
		searchParams.get('taggingId') ?? searchParams.get('id')
	);
	const categoryId = parseNumberOrNull(
		searchParams.get('categoryId') ?? searchParams.get('category')
	);
	const subCategoryId = parseNumberOrNull(
		searchParams.get('subCategoryId') ??
			searchParams.get('subCategory')
	);
	const service =
		searchParams.get('service') ?? searchParams.get('serviceName');

	return {
		taggingId,
		categoryId,
		subCategoryId,
		service: service?.trim() || null
	};
}

export function createBillingSetupCareSettingHandlers(
	careSetting: BillingSetupCareSettingEnum
): {
	GET: RequestHandler;
	POST: RequestHandler;
	DELETE: RequestHandler;
} {
	return {
		GET: async (event) => {
			const hospitalId = String(event.params.hospital_id ?? '');
			if (!hospitalId) throw error(400, 'Missing hospital id');

			const mode = event.url.searchParams.get('mode') ?? 'linked';
			const page = Number(event.url.searchParams.get('page') ?? '1');
			const pageSize = Number(
				event.url.searchParams.get('pageSize') ?? '10'
			);
			const branchId = event.url.searchParams.get('branchId')?.trim();
			const filters = parseTaggingFilters(event.url.searchParams);

			if (mode === 'available') {
				if (!branchId) {
					throw error(400, 'branchId is required');
				}
				const data = await listAvailableServiceTaggingsForBillingSetup(
					event,
					{
						hospitalId,
						careSetting,
						branchId,
						page,
						pageSize,
						filters
					}
				);
				return json(data);
			}

			const data = await listBillingSetupLinksPaginated(event, {
				hospitalId,
				careSetting,
				page,
				pageSize,
				branchId: branchId || null,
				filters
			});
			return json(data);
		},

		POST: async (event) => {
			const hospitalId = String(event.params.hospital_id ?? '');
			if (!hospitalId) throw error(400, 'Missing hospital id');

			const body = (await event.request.json()) as Record<
				string,
				unknown
			>;
			const raw = body.serviceTaggingIds;
			const serviceTaggingIds = Array.isArray(raw)
				? raw.map((v) => Number(v)).filter((n) => Number.isFinite(n))
				: typeof raw === 'number' || typeof raw === 'string'
					? [Number(raw)].filter((n) => Number.isFinite(n))
					: [];

			const result = await linkBillingSetupServiceTaggings(event, {
				hospitalId,
				careSetting,
				serviceTaggingIds
			});
			return json(result);
		},

		DELETE: async (event) => {
			const hospitalId = String(event.params.hospital_id ?? '');
			if (!hospitalId) throw error(400, 'Missing hospital id');

			const body = (await event.request.json()) as Record<
				string,
				unknown
			>;
			const id = Number(body.id);
			if (!Number.isFinite(id) || id <= 0) {
				throw error(400, 'id is required');
			}
			await unlinkBillingSetupLink(event, {
				hospitalId,
				careSetting,
				id
			});
			return json({ ok: true });
		}
	};
}
