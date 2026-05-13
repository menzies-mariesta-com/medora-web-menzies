import { error, json, type RequestEvent } from '@sveltejs/kit';
import * as lists from '$lib/server/heka/master/lookup-lists.server';

const KINDS = new Set([
	'gender',
	'maritalStatus',
	'title',
	'identityType',
	'bloodType',
	'country',
	'state',
	'city',
	'postalCode',
	'nationality',
	'religion'
]);

export async function GET(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	const kind = event.url.searchParams.get('kind') ?? '';
	if (!KINDS.has(kind)) throw error(400, 'Unknown or missing kind');

	switch (kind) {
		case 'gender':
			return json(await lists.listGender());
		case 'maritalStatus':
			return json(await lists.listMaritalStatus());
		case 'title':
			return json(await lists.listTitle());
		case 'identityType':
			return json(await lists.listIdentityType());
		case 'bloodType':
			return json(await lists.listBloodType());
		case 'country':
			return json(await lists.listCountry());
		case 'state':
			return json(await lists.listState());
		case 'city':
			return json(await lists.listCity());
		case 'postalCode':
			return json(await lists.listPostalCode());
		case 'nationality':
			return json(await lists.listNationality());
		case 'religion':
			return json(await lists.listReligion());
		default:
			throw error(400, 'Unknown kind');
	}
}
