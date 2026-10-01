import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	const origin = (
		env.BETTER_AUTH_BASE_URL ||
		env.BETTER_AUTH_URL ||
		'http://localhost:4002'
	).replace(/\/$/, '');

	return { origin };
};
