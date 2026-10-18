import { and, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';

const patientWithHospitalWith = {
	user: true,
	title: true,
	gender: true,
	status: true,
	hospital: true,
	phonePrimaryCountry: true,
	city: true,
	state: true,
	country: true
} as const;

export type PatientSessionRow = NonNullable<
	Awaited<ReturnType<typeof getPatientByUserId>>
>;

export async function getPatientByUserId(userId: string) {
	return ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.userId, userId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		with: patientWithHospitalWith
	});
}
