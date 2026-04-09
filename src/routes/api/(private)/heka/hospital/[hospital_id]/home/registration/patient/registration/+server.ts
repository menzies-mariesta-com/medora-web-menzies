import { error, json, type RequestEvent } from '@sveltejs/kit';
import type { PatientSchemaUpdate } from '$lib/server/db/schema-type';
import * as reg from '$lib/server/heka/registration/patient-registration.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	if (!hospitalId) throw error(400, 'hospital_id is required');

	if (event.url.searchParams.get('nextCode') === '1') {
		return json({
			code: await reg.getNextPatientCode(event, hospitalId)
		});
	}

	const id = event.url.searchParams.get('id') ?? '';
	if (!id) throw error(400, 'id is required');
	const patient = await reg.getPatientForRegistrationForm(event, {
		hospitalId,
		id
	});
	return json(patient ?? null);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	if (!hospitalId) throw error(400, 'hospital_id is required');

	const body = (await event.request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) throw error(400, 'Body required');
	const mode = String(body.mode ?? '');

	if (mode === 'duplicates') {
		const list = await reg.getDuplicatePatientsInHospital(event, {
			hospitalId,
			titleId:
				body.titleId != null && body.titleId !== ''
					? Number(body.titleId)
					: null,
			firstName: String(body.firstName ?? ''),
			middleName: String(body.middleName ?? ''),
			lastName: String(body.lastName ?? ''),
			fatherTitleId:
				body.fatherTitleId != null && body.fatherTitleId !== ''
					? Number(body.fatherTitleId)
					: null,
			fatherName: String(body.fatherName ?? ''),
			phonePrimary: String(body.phonePrimary ?? ''),
			identityTypeId:
				body.identityTypeId != null && body.identityTypeId !== ''
					? Number(body.identityTypeId)
					: null,
			identityNo: String(body.identityNo ?? ''),
			excludePatientId:
				typeof body.excludePatientId === 'string'
					? body.excludePatientId
					: null
		});
		return json({ data: list });
	}

	if (mode === 'create') {
		const payloadHospital =
			typeof body.hospitalId === 'string' && body.hospitalId
				? body.hospitalId
				: hospitalId;
		if (payloadHospital !== hospitalId) {
			throw error(400, 'hospitalId mismatch');
		}
		const result = await reg.createPatientWithUserInHospital(event, {
			email: String(body.email ?? ''),
			name: String(body.name ?? ''),
			hospitalId: payloadHospital,
			branchId:
				typeof body.branchId === 'string' ? body.branchId : undefined,
			titleId:
				body.titleId != null && body.titleId !== ''
					? Number(body.titleId)
					: undefined,
			firstName:
				typeof body.firstName === 'string' ? body.firstName : undefined,
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
			phonePrimaryCountryId:
				body.phonePrimaryCountryId != null &&
				body.phonePrimaryCountryId !== ''
					? Number(body.phonePrimaryCountryId)
					: undefined,
			phoneSecondaryCountryId:
				body.phoneSecondaryCountryId != null &&
				body.phoneSecondaryCountryId !== ''
					? Number(body.phoneSecondaryCountryId)
					: undefined,
			fatherTitleId:
				body.fatherTitleId != null && body.fatherTitleId !== ''
					? Number(body.fatherTitleId)
					: undefined,
			fatherName:
				typeof body.fatherName === 'string'
					? body.fatherName
					: undefined,
			guardianTitleId:
				body.guardianTitleId != null && body.guardianTitleId !== ''
					? Number(body.guardianTitleId)
					: undefined,
			identityNo:
				typeof body.identityNo === 'string'
					? body.identityNo
					: undefined,
			dateOfBirth:
				typeof body.dateOfBirth === 'string'
					? body.dateOfBirth
					: undefined,
			guardianName:
				typeof body.guardianName === 'string'
					? body.guardianName
					: undefined,
			guardianPhone:
				typeof body.guardianPhone === 'string'
					? body.guardianPhone
					: undefined,
			guardianPhoneCountryId:
				body.guardianPhoneCountryId != null &&
				body.guardianPhoneCountryId !== ''
					? Number(body.guardianPhoneCountryId)
					: undefined,
			photoPath:
				typeof body.photoPath === 'string'
					? body.photoPath
					: undefined,
			address:
				typeof body.address === 'string' ? body.address : undefined,
			remark:
				typeof body.remark === 'string' ? body.remark : undefined,
			maritalStatusId:
				body.maritalStatusId != null && body.maritalStatusId !== ''
					? Number(body.maritalStatusId)
					: undefined,
			genderId:
				body.genderId != null && body.genderId !== ''
					? Number(body.genderId)
					: undefined,
			identityTypeId:
				body.identityTypeId != null && body.identityTypeId !== ''
					? Number(body.identityTypeId)
					: undefined,
			bloodTypeId:
				body.bloodTypeId != null && body.bloodTypeId !== ''
					? Number(body.bloodTypeId)
					: undefined,
			cityId:
				body.cityId != null && body.cityId !== ''
					? Number(body.cityId)
					: undefined,
			stateId:
				body.stateId != null && body.stateId !== ''
					? Number(body.stateId)
					: undefined,
			countryId:
				body.countryId != null && body.countryId !== ''
					? Number(body.countryId)
					: undefined,
			postalCodeId:
				body.postalCodeId != null && body.postalCodeId !== ''
					? Number(body.postalCodeId)
					: undefined,
			nationalityId:
				body.nationalityId != null && body.nationalityId !== ''
					? Number(body.nationalityId)
					: undefined,
			religionId:
				body.religionId != null && body.religionId !== ''
					? Number(body.religionId)
					: undefined,
			isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
			nameMasking:
				typeof body.nameMasking === 'boolean'
					? body.nameMasking
					: undefined
		});
		return json(result);
	}

	throw error(400, 'Unknown mode');
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	if (!hospitalId) throw error(400, 'hospital_id is required');

	const body = (await event.request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) throw error(400, 'Body required');
	const id = String(body.id ?? '');
	if (!id) throw error(400, 'id is required');
	const payloadHospital =
		typeof body.hospitalId === 'string' && body.hospitalId
			? body.hospitalId
			: hospitalId;
	if (payloadHospital !== hospitalId) {
		throw error(400, 'hospitalId mismatch');
	}
	const updates: Record<string, unknown> = { ...body };
	// Optional: update linked auth user fields (allowed for staff within hospital).
	const userName =
		typeof updates.userName === 'string' ? String(updates.userName) : null;
	const userEmail =
		typeof updates.userEmail === 'string' ? String(updates.userEmail) : null;
	delete updates.id;
	delete updates.hospitalId;
	delete updates.userName;
	delete updates.userEmail;
	const row = await reg.updatePatientInHospital(event, {
		hospitalId,
		id,
		...(updates as PatientSchemaUpdate)
	});
	if (userName != null || userEmail != null) {
		await reg.updatePatientUserInHospital(event, {
			hospitalId,
			patientId: id,
			userName,
			userEmail
		});
	}
	return json(row);
}
