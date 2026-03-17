import type { PageServerLoad } from './$types';
import { getHospitalWithOwnerPaginated } from '$lib/remote/table/information-table/hospital.remote';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { AppEnum } from '$lib/model/enum/app.enum';

export const load: PageServerLoad = async ({ locals }) => {
	const userRoleId = locals.userRoleId ?? null;
	const userId = locals.user?.id ?? null;
	const isOwner = userRoleId === RoleEnum.OWNER;
	const ownerId =
		isOwner && userId ? userId : undefined;

	const result = await getHospitalWithOwnerPaginated({
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
