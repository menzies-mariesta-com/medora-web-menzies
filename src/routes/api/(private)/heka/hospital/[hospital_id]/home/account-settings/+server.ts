import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getSelfAccountSettings,
	updateSelfAccountSettings
} from '$lib/server/heka/account/account-settings.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	return json(await getSelfAccountSettings(event, { hospitalId }));
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	return json(
		await updateSelfAccountSettings(event, {
			hospitalId,
			firstName: body.firstName as any,
			middleName: body.middleName as any,
			lastName: body.lastName as any,
			phonePrimary: body.phonePrimary as any,
			address: body.address as any,
			dateOfBirth: body.dateOfBirth as any,
			genderId:
				body.genderId === undefined
					? undefined
					: body.genderId === null || body.genderId === ''
						? null
						: Number(body.genderId),
			photoUrl: body.photoUrl as any,
			licenseNo: body.licenseNo as any,
			licenseExpiryDate: body.licenseExpiryDate as any,
			signatureImageUrl: body.signatureImageUrl as any,
			signatureText: body.signatureText as any
		})
	);
};

