import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PageWithRelations } from '$lib/model/type/heka/page.type';
import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

const REPORTS_INDEX_PATH = '/heka/home/inventory/reports';

function normPath(p: string | null | undefined): string {
	return (p ?? '').replace(/\/$/, '') || '/';
}

export const load: PageServerLoad = async ({ parent, params }) => {
	const hospitalId = params.hospital_id;
	const { pageData } = await parent();
	const pages = (pageData ?? []) as PageWithRelations[];
	const reportsPage = pages.find(
		(p) => normPath(p.pageUrl) === REPORTS_INDEX_PATH
	);
	if (!reportsPage) return {};

	const children = pages
		.filter((p) => p.parentId === reportsPage.id)
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
