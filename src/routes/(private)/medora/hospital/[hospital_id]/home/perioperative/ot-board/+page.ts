import { redirect } from '@sveltejs/kit';

export function load({
	params
}: {
	params: { hospital_id?: string };
}) {
	throw redirect(
		307,
		`/medora/hospital/${params.hospital_id ?? ''}/home/operation-theatre/ot-scheduler`
	);
}
