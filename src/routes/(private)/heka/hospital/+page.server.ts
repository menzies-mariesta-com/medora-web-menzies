import type { PageServerLoad } from './$types';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { AppEnum } from '$lib/model/enum/app.enum';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const userRoleId = locals.userRoleId ?? null;
	const userId = locals.user?.id ?? null;
	const isOwner = userRoleId === RoleEnum.OWNER;
	const ownerId = isOwner && userId ? userId : undefined;

	const url = new URL('/api/heka/hospital', 'http://internal');
	url.searchParams.set('page', '1');
	url.searchParams.set(
		'pageSize',
		String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	);
	url.searchParams.set('statusId', String(StatusEnum.ACTIVE));
	if (ownerId != null) url.searchParams.set('ownerId', ownerId);

	const res = await fetch(url.pathname + url.search);
	if (!res.ok) {
		return {
			initialHospitals: [],
			initialTotal: 0,
			initialPage: 1,
			initialPageSize: AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE,
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
