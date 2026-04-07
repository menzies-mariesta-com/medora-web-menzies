import { error, json, type RequestEvent } from '@sveltejs/kit';
import { completeOwnerSignupProfile } from '$lib/server/heka/auth/signup-owner.server';

export async function POST(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	const body = (await event.request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	const row = await completeOwnerSignupProfile(event, {
		firstName:
			typeof body?.firstName === 'string' ? body.firstName : undefined,
		middleName:
			typeof body?.middleName === 'string' ? body.middleName : undefined,
		lastName:
			typeof body?.lastName === 'string' ? body.lastName : undefined,
		countryId:
			body?.countryId != null && body.countryId !== ''
				? Number(body.countryId)
				: undefined,
		genderId:
			body?.genderId != null && body.genderId !== ''
				? Number(body.genderId)
				: undefined,
		phonePrimary:
			typeof body?.phonePrimary === 'string'
				? body.phonePrimary
				: undefined
	});
	return json(row);
}
