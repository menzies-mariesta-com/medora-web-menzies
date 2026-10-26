import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, ilike, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { createPatientWithUserInHospital } from '$lib/server/medora/registration/patient-registration.server';
import { createPatientVisitInHospital } from '$lib/server/medora/patient-visit/patient-visit.server';
import { createOtRequest } from './ot-request.server';
import { uuidV7 } from '$lib/util/id.util';

const NO_EMAIL_SUFFIX = '@no-email.medora';

async function resolveVisitTypeId(): Promise<number> {
	const db = ensureDb();
	const [opd] = await db
		.select({ id: table.visitTypeTable.id })
		.from(table.visitTypeTable)
		.where(
			and(
				eq(table.visitTypeTable.statusId, StatusEnum.ACTIVE),
				ilike(table.visitTypeTable.name, 'OPD%')
			)
		)
		.orderBy(asc(table.visitTypeTable.id))
		.limit(1);
	if (opd) return opd.id;
	const [first] = await db
		.select({ id: table.visitTypeTable.id })
		.from(table.visitTypeTable)
		.where(
			and(
				eq(table.visitTypeTable.statusId, StatusEnum.ACTIVE),
				ne(table.visitTypeTable.id, 0)
			)
		)
		.orderBy(asc(table.visitTypeTable.id))
		.limit(1);
	if (!first) {
		throw error(
			400,
			'No active visit type is configured. Configure visit types before registering an OT patient.'
		);
	}
	return first.id;
}

export async function registerOtPatient(
	event: RequestEvent,
	input: {
		hospitalId: string;
		branchId: string;
		firstName: string;
		middleName?: string | null;
		lastName: string;
		phonePrimary?: string | null;
		email?: string | null;
		dateOfBirth?: string | null;
		genderId?: number | null;
		address?: string | null;
		procedureName?: string | null;
		otRequestDate?: string | null;
		priority?: string;
	}
) {
	const firstName = input.firstName?.trim();
	const lastName = input.lastName?.trim();
	if (!firstName || !lastName) {
		throw error(400, 'First name and last name are required.');
	}
	if (!input.branchId) throw error(400, 'Facility is required.');

	const name = [firstName, input.middleName, lastName]
		.filter(Boolean)
		.join(' ')
		.trim();
	const email =
		input.email?.trim() || `${uuidV7()}${NO_EMAIL_SUFFIX}`;

	const created = await createPatientWithUserInHospital(event, {
		email,
		name,
		hospitalId: input.hospitalId,
		branchId: input.branchId,
		firstName,
		middleName: input.middleName?.trim() || undefined,
		lastName,
		phonePrimary: input.phonePrimary?.trim() || undefined,
		dateOfBirth: input.dateOfBirth?.trim() || undefined,
		genderId: input.genderId ?? undefined,
		address: input.address?.trim() || undefined,
		isActive: true
	});

	const visitTypeId = await resolveVisitTypeId();
	const visit = await createPatientVisitInHospital(event, {
		hospitalId: input.hospitalId,
		branchId: input.branchId,
		patientId: created.patient.id,
		visitTypeId,
		doctorId: null
	});

	let otRequest: Awaited<ReturnType<typeof createOtRequest>> | null =
		null;
	if (input.procedureName?.trim()) {
		otRequest = await createOtRequest({
			hospitalId: input.hospitalId,
			visitId: visit.id,
			staffId: event.locals.staff?.id ?? null,
			procedureName: input.procedureName,
			otRequestDate: input.otRequestDate,
			priority: input.priority ?? 'elective'
		});
	}

	return {
		patient: created.patient,
		visit,
		otRequest
	};
}
