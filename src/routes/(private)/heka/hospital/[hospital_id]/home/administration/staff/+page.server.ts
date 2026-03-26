import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PageWithRelations } from '$lib/remote/table/information-table/page.remote';
import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

const STAFF_INDEX_PATH = '/heka/home/administration/staff';

function normPath(p: string | null | undefined): string {
	return (p ?? '').replace(/\/$/, '') || '/';
}

export const load: PageServerLoad = async ({ parent, params }) => {
	const hospitalId = params.hospital_id;
	// Use page list from `home/+layout.server.ts` — avoid POST /api/remote/invoke
	// during SSR (session cookies are not always applied to that internal fetch).
	const { pageData } = await parent();
	const pages = (pageData ?? []) as PageWithRelations[];
	const staffPage = pages.find(
		(p) => normPath(p.pageUrl) === STAFF_INDEX_PATH
	);
	if (!staffPage) return {};

	const children = pages
		.filter((p) => p.parentId === staffPage.id)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
	const first = children[0];
	if (first?.pageUrl && hospitalId) {
		throw redirect(
			302,
			hekaHospitalPageUrl(hospitalId, first.pageUrl)
		);
	}

	return {};
};
