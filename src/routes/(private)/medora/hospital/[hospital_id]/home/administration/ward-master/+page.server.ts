import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';
import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';

const WARD_MASTER_INDEX_PATH =
	'/medora/home/administration/ward-master';

function normPath(p: string | null | undefined): string {
	return (p ?? '').replace(/\/$/, '') || '/';
}

export const load: PageServerLoad = async ({ parent, params }) => {
	const hospitalId = params.hospital_id;
	const { pageData } = await parent();
	const pages = (pageData ?? []) as PageWithRelations[];
	const wardMasterPage = pages.find(
		(p) => normPath(p.pageUrl) === WARD_MASTER_INDEX_PATH
	);
	if (!wardMasterPage) return {};

	const children = pages
		.filter((p) => p.parentId === wardMasterPage.id)
		.sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
	const first = children[0];
	if (first?.pageUrl && hospitalId) {
		throw redirect(
			302,
			medoraHospitalPageUrl(hospitalId, first.pageUrl)
		);
	}

	return {};
};
