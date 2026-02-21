import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPage } from '$lib/remote/table/information-table/page.remote';
import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

const STAFF_INDEX_PATH = '/heka/home/administration/staff';

function normPath(p: string | null | undefined): string {
	return (p ?? '').replace(/\/$/, '') || '/';
}

export const load: PageServerLoad = async ({ params }) => {
	const hospitalId = params.hospital_id;
	const pages = await getPage();
	const staffPage = pages.find((p) => normPath(p.pageUrl) === STAFF_INDEX_PATH);
	if (!staffPage) return {};

	const children = pages
		.filter((p) => p.parentId === staffPage.id)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
	const first = children[0];
	if (first?.pageUrl && hospitalId) {
		throw redirect(302, hekaHospitalPageUrl(hospitalId, first.pageUrl));
	}

	return {};
};
