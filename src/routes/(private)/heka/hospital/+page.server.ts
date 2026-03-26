import type { PageServerLoad } from './$types';
import { getHospitalWithOwnerPaginatedWithFetch } from '$lib/tool/remote/table/information-table/hospital.http.tool.svelte';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { AppEnum } from '$lib/model/enum/app.enum';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const userRoleId = locals.userRoleId ?? null;
	const userId = locals.user?.id ?? null;
	const isOwner = userRoleId === RoleEnum.OWNER;
	const ownerId = isOwner && userId ? userId : undefined;

	const result = await getHospitalWithOwnerPaginatedWithFetch(fetch, {
		page: 1,
		pageSize: AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE,
		...(ownerId != null && { ownerId }),
		statusId: StatusEnum.ACTIVE
	});

	return {
		initialHospitals: result.data,
		initialTotal: result.total,
		initialPage: result.page,
		initialPageSize: result.pageSize,
		initialTotalPages: result.totalPages
	};
};
