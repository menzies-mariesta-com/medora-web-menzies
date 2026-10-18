import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const hid = params.hospital_id;
	if (!hid) return {};
	throw redirect(
		302,
		`/medora/hospital/${hid}/home/nursing-workbench/ed/track-board`
	);
};
