import { json, type RequestEvent } from '@sveltejs/kit';
import { getAdminStaffPaginated } from '$lib/server/medora/admin/admin-staff.server';

export async function GET(event: RequestEvent) {
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '20'
	);
	const name = event.url.searchParams.get('name') ?? undefined;
	const email = event.url.searchParams.get('email') ?? undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await getAdminStaffPaginated(event, {
			page,
			pageSize,
			name,
			email,
			statusId:
				statusId != null && Number.isFinite(statusId)
					? statusId
					: undefined
		})
	);
}
