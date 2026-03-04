import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPage } from '$lib/remote/table/information-table/page.remote';
import {
	hekaHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

function normPath(p: string | null | undefined): string {
	return (p ?? '').replace(/\/$/, '') || '/';
}

export const load: PageServerLoad = async ({ params }) => {
	const hospitalId = params.hospital_id;
	const pages = await getPage();
	const emrPage = pages.find(
		(p) =>
			normPath(p.pageUrl) ===
			WebRoutesEnum.HEKA_HOME_NURSING_WORKBENCH_EMR
	);
	if (!emrPage) return {};

	const children = pages
		.filter((p) => p.parentId === emrPage.id)
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
