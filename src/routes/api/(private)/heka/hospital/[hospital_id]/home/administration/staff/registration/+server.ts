import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import {
	createStaffRegistration,
	getStaffRegistrationLookups,
	updateStaffRegistration
} from '$lib/server/heka/administration/staff-registration.server';
import { getStaffByIdWithRelations } from '$lib/server/heka/administration/staff.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'lookups';
	if (mode === 'lookups') {
		return json(await getStaffRegistrationLookups(event, { hospitalId }));
	}
	if (mode === 'staff') {
		const id = event.url.searchParams.get('id') ?? '';
		return json(await getStaffByIdWithRelations(event, { hospitalId, id }));
	}

	return json({ error: 'Unsupported mode' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	const body = (await event.request.json()) as Record<string, unknown>;

	if (mode === 'create') {
		const result = await createStaffRegistration(event, {
			hospitalId,
			email: String(body.email ?? ''),
			name: String(body.name ?? ''),
			code: typeof body.code === 'string' ? body.code : undefined,
			firstName:
				typeof body.firstName === 'string' ? body.firstName : undefined,
			middleName:
				typeof body.middleName === 'string' ? body.middleName : undefined,
			lastName:
				typeof body.lastName === 'string' ? body.lastName : undefined,
			phonePrimary:
				typeof body.phonePrimary === 'string'
					? body.phonePrimary
					: undefined,
			phoneSecondary:
				typeof body.phoneSecondary === 'string'
					? body.phoneSecondary
					: undefined,
			phonePrimaryCountryId:
				typeof body.phonePrimaryCountryId === 'number'
					? body.phonePrimaryCountryId
					: undefined,
			phoneSecondaryCountryId:
				typeof body.phoneSecondaryCountryId === 'number'
					? body.phoneSecondaryCountryId
					: undefined,
			dateOfBirth:
				typeof body.dateOfBirth === 'string' ? body.dateOfBirth : undefined,
			joinDate: typeof body.joinDate === 'string' ? body.joinDate : undefined,
			resignDate:
				typeof body.resignDate === 'string' ? body.resignDate : undefined,
			address: typeof body.address === 'string' ? body.address : undefined,
			remark: typeof body.remark === 'string' ? body.remark : undefined,
			identityNo:
				typeof body.identityNo === 'string' ? body.identityNo : undefined,
			titleId: typeof body.titleId === 'number' ? body.titleId : undefined,
			genderId: typeof body.genderId === 'number' ? body.genderId : undefined,
			maritalStatusId:
				typeof body.maritalStatusId === 'number'
					? body.maritalStatusId
					: undefined,
			staffEmploymentTypeId:
				typeof body.staffEmploymentTypeId === 'number'
					? body.staffEmploymentTypeId
					: undefined,
			staffTypeId:
				typeof body.staffTypeId === 'number' ? body.staffTypeId : undefined,
			departmentId:
				typeof body.departmentId === 'number' ? body.departmentId : undefined,
			specializationId:
				typeof body.specializationId === 'number'
					? body.specializationId
					: undefined,
			countryId:
				typeof body.countryId === 'number' ? body.countryId : undefined,
			stateId: typeof body.stateId === 'number' ? body.stateId : undefined,
			cityId: typeof body.cityId === 'number' ? body.cityId : undefined,
			postalCodeId:
				typeof body.postalCodeId === 'number' ? body.postalCodeId : undefined,
			nationalityId:
				typeof body.nationalityId === 'number'
					? body.nationalityId
					: undefined,
			identityTypeId:
				typeof body.identityTypeId === 'number'
					? body.identityTypeId
					: undefined,
			statusId:
				typeof body.statusId === 'number' ? body.statusId : undefined,
			photoUrl:
				body.photoUrl === null
					? null
					: typeof body.photoUrl === 'string'
						? body.photoUrl
						: undefined,
			userGroupIds: Array.isArray(body.userGroupIds)
				? (body.userGroupIds.filter((n) => typeof n === 'number') as number[])
				: undefined,
			branchIds: Array.isArray(body.branchIds)
				? (body.branchIds.filter((s) => typeof s === 'string') as string[])
				: undefined,
			staffDetail:
				body.staffDetail && typeof body.staffDetail === 'object'
					? (body.staffDetail as any)
					: undefined
		});
		return json(result);
	}

	if (mode === 'update') {
		const result = await updateStaffRegistration(event, {
			hospitalId,
			id: String(body.id ?? ''),
			user:
				body.user && typeof body.user === 'object'
					? (body.user as any)
					: undefined,
			staff:
				body.staff && typeof body.staff === 'object'
					? (body.staff as any)
					: ({} as any),
			departmentId:
				body.departmentId === null
					? null
					: typeof body.departmentId === 'number'
						? body.departmentId
						: undefined,
			userGroupIds: Array.isArray(body.userGroupIds)
				? (body.userGroupIds.filter((n) => typeof n === 'number') as number[])
				: undefined,
			branchIds: Array.isArray(body.branchIds)
				? (body.branchIds.filter((s) => typeof s === 'string') as string[])
				: undefined,
			staffDetail:
				body.staffDetail === null
					? null
					: body.staffDetail && typeof body.staffDetail === 'object'
						? (body.staffDetail as any)
						: undefined
		});
		return json(result);
	}

	return json({ error: 'Unsupported mode' }, { status: 400 });
};

