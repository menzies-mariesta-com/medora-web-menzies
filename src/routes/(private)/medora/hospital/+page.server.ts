import type { PageServerLoad } from './$types';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';

const CHOOSER_PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const userRoleId = locals.userRoleId ?? null;
	const userId = locals.user?.id ?? null;
	const isOwner = userRoleId === RoleEnum.OWNER;
	const ownerId = isOwner && userId ? userId : undefined;

	const url = new URL('/api/medora/hospital', 'http://internal');
	url.searchParams.set('page', '1');
	url.searchParams.set('pageSize', String(CHOOSER_PAGE_SIZE));
	url.searchParams.set('statusId', String(StatusEnum.ACTIVE));
	if (ownerId != null) url.searchParams.set('ownerId', ownerId);

	const res = await fetch(url.pathname + url.search);
	if (!res.ok) {
		return {
			initialHospitals: [],
			initialTotal: 0,
			initialPage: 1,
			initialPageSize: CHOOSER_PAGE_SIZE,
			initialTotalPages: 1
		};
	}
	const result = (await res.json()) as {
		data: unknown[];
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};

	return {
		initialHospitals: result.data,
		initialTotal: result.total,
		initialPage: result.page,
		initialPageSize: result.pageSize,
		initialTotalPages: result.totalPages
	};
};
