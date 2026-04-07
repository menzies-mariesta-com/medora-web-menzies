import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	hekaHospitalPageUrl,
	WebRoutesEnum
} from '$lib/model/enum/routes.enum';

type PageWithRelations = {
	id: number;
	parentId: number | null;
	sequenceNo: number | null;
	pageUrl: string | null;
};

function normPath(p: string | null | undefined): string {
	return (p ?? '').replace(/\/$/, '') || '/';
}

export const load: PageServerLoad = async ({ parent, params }) => {
	const hospitalId = params.hospital_id;
	const { pageData } = await parent();
	const pages = (pageData ?? []) as PageWithRelations[];
	const referPage = pages.find(
		(p) => normPath(p.pageUrl) === WebRoutesEnum.HEKA_HOME_CPOE_REFER
	);
	if (!referPage) return {};

	const children = pages
		.filter((p) => p.parentId === referPage.id)
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
