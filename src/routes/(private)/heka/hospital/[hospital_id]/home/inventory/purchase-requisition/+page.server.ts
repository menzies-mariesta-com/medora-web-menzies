import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Legacy `?prId=` → `/purchase-requisition/[pr_id]`. */
export const load: PageServerLoad = ({ url, params }) => {
	const prId = url.searchParams.get('prId')?.trim();
	if (prId) {
		throw redirect(
			302,
			`/heka/hospital/${params.hospital_id}/home/inventory/purchase-requisition/${encodeURIComponent(prId)}`
		);
	}
	return {};
};
