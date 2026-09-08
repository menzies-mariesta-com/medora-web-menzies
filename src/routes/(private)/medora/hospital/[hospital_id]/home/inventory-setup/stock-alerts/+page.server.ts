import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	throw redirect(
		307,
		`/medora/hospital/${params.hospital_id}/home/inventory-setup/stock-alerts/policy`
	);
};
