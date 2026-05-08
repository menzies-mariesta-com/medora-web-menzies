import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Legacy `?id=` detail URLs → `/purchase-order/[po_id]`. */
export const load: PageServerLoad = ({ url, params }) => {
	const id = url.searchParams.get('id')?.trim();
	if (id) {
		throw redirect(
			302,
			`/heka/hospital/${params.hospital_id}/home/inventory/purchase-order/${encodeURIComponent(id)}`
		);
	}
	return {};
};
