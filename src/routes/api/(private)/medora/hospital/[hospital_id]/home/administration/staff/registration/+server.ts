import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	createStaffRegistration,
	getStaffRegistrationLookups,
	updateStaffRegistration
} from '$lib/server/medora/administration/staff-registration.server';
import { getStaffByIdWithRelations } from '$lib/server/medora/administration/staff.server';

function asOptionalFiniteInt(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}

function asNumberArray(value: unknown): number[] | undefined {
	if (!Array.isArray(value)) return undefined;
	return value
		.map((n) => asOptionalFiniteInt(n))
		.filter((n): n is number => n != null);
}

function asStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	return value.filter((s): s is string => typeof s === 'string');
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'lookups';
	if (mode === 'lookups') {
		return json(
			await getStaffRegistrationLookups(event, { hospitalId })
		);
	}
	if (mode === 'staff') {
		const id = event.url.searchParams.get('id') ?? '';
		return json(
			await getStaffByIdWithRelations(event, { hospitalId, id })
		);
	}

	return json({ error: 'Unsupported mode' }, { status: 400 });
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? '';
	const body = (await event.request.json()) as Record<
		string,
		unknown
	>;

	if (mode === 'create') {
		const staffDetailRaw =
			body.staffDetail && typeof body.staffDetail === 'object'
				? (body.staffDetail as Record<string, unknown>)
				: undefined;
		const result = await createStaffRegistration(event, {
			hospitalId,
			email: String(body.email ?? ''),
			name: String(body.name ?? ''),
			code: typeof body.code === 'string' ? body.code : undefined,
			firstName:
				typeof body.firstName === 'string'
					? body.firstName
					: undefined,
			middleName:
				typeof body.middleName === 'string'
					? body.middleName
					: undefined,
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
			phonePrimaryCountryId: asOptionalFiniteInt(
				body.phonePrimaryCountryId
			),
			phoneSecondaryCountryId: asOptionalFiniteInt(
				body.phoneSecondaryCountryId
			),
			dateOfBirth:
				typeof body.dateOfBirth === 'string'
					? body.dateOfBirth
					: undefined,
			joinDate:
				typeof body.joinDate === 'string' ? body.joinDate : undefined,
			resignDate:
				typeof body.resignDate === 'string'
					? body.resignDate
					: undefined,
			address:
				typeof body.address === 'string' ? body.address : undefined,
			remark:
				typeof body.remark === 'string' ? body.remark : undefined,
			identityNo:
				typeof body.identityNo === 'string'
					? body.identityNo
					: undefined,
			titleId: asOptionalFiniteInt(body.titleId),
			genderId: asOptionalFiniteInt(body.genderId),
			maritalStatusId: asOptionalFiniteInt(body.maritalStatusId),
			staffEmploymentTypeId: asOptionalFiniteInt(
				body.staffEmploymentTypeId
			),
			staffTypeId: asOptionalFiniteInt(body.staffTypeId),
			departmentId: asOptionalFiniteInt(body.departmentId),
			specializationId: asOptionalFiniteInt(body.specializationId),
			countryId: asOptionalFiniteInt(body.countryId),
			stateId: asOptionalFiniteInt(body.stateId),
			cityId: asOptionalFiniteInt(body.cityId),
			postalCodeId: asOptionalFiniteInt(body.postalCodeId),
			nationalityId: asOptionalFiniteInt(body.nationalityId),
			identityTypeId: asOptionalFiniteInt(body.identityTypeId),
			statusId: asOptionalFiniteInt(body.statusId),
			photoUrl:
				body.photoUrl === null
					? null
					: typeof body.photoUrl === 'string'
						? body.photoUrl
						: undefined,
			userGroupIds: asNumberArray(body.userGroupIds),
			branchIds: asStringArray(body.branchIds),
			staffDetail: staffDetailRaw
				? {
						education:
							typeof staffDetailRaw.education === 'string'
								? staffDetailRaw.education
								: undefined,
						designation:
							typeof staffDetailRaw.designation === 'string'
								? staffDetailRaw.designation
								: undefined,
						bloodTypeId: asOptionalFiniteInt(
							staffDetailRaw.bloodTypeId
						),
						licenseNo:
							typeof staffDetailRaw.licenseNo === 'string'
								? staffDetailRaw.licenseNo
								: undefined,
						licenseExpiryDate:
							typeof staffDetailRaw.licenseExpiryDate ===
							'string'
								? staffDetailRaw.licenseExpiryDate
								: undefined,
						signatureImageUrl:
							staffDetailRaw.signatureImageUrl === null
								? null
								: typeof staffDetailRaw.signatureImageUrl ===
									  'string'
									? staffDetailRaw.signatureImageUrl
									: undefined,
						signatureText:
							typeof staffDetailRaw.signatureText === 'string'
								? staffDetailRaw.signatureText
								: undefined
					}
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
					? (body.user as {
							id: string;
							email?: string;
							name?: string;
						})
					: undefined,
			staff:
				body.staff && typeof body.staff === 'object'
					? (body.staff as never)
					: ({} as never),
			departmentId:
				body.departmentId === null
					? null
					: asOptionalFiniteInt(body.departmentId),
			userGroupIds: asNumberArray(body.userGroupIds),
			branchIds: asStringArray(body.branchIds),
			staffDetail:
				body.staffDetail === null
					? null
					: body.staffDetail && typeof body.staffDetail === 'object'
						? (body.staffDetail as never)
						: undefined
		});
		return json(result);
	}

	return json({ error: 'Unsupported mode' }, { status: 400 });
};
