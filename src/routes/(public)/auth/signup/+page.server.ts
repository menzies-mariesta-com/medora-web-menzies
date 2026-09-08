import type { PageServerLoad } from './$types';
import * as lists from '$lib/server/medora/master/lookup-lists.server';

export const load: PageServerLoad = async () => {
	const [countries, genders] = await Promise.all([
		lists.listCountry(),
		lists.listGender()
	]);
	return { countries, genders };
};
