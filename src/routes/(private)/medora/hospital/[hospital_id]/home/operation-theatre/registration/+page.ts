import { redirect } from '@sveltejs/kit';

export function load({
	params
}: {
	params: { hospital_id?: string };
}) {
	const hospitalId = params.hospital_id ?? '';
	throw redirect(
		307,
		`/medora/hospital/${hospitalId}/home/operation-theatre/registration/ot-patient`
	);
}
