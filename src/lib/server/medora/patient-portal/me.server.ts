import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PatientPortalContext } from './require-patient-context.server';

function displayName(patient: PatientPortalContext['patient']): string {
	const parts = [
		patient.firstName,
		patient.middleName,
		patient.lastName
	].filter(Boolean);
	return parts.join(' ').trim() || patient.user?.name || 'Patient';
}

export async function buildPatientMeDto(ctx: PatientPortalContext) {
	const { patient } = ctx;
	const [userRow] = await ensureDb()
		.select({ mustChangePassword: table.userTable.mustChangePassword })
		.from(table.userTable)
		.where(eq(table.userTable.id, ctx.userId))
		.limit(1);

	return {
		userId: ctx.userId,
		patientId: ctx.patientId,
		hospitalId: ctx.hospitalId,
		mustChangePassword: Boolean(userRow?.mustChangePassword),
		hospitalName: patient.hospital?.name ?? null,
		patientCode: patient.code ?? null,
		displayName: displayName(patient),
		firstName: patient.firstName,
		middleName: patient.middleName,
		lastName: patient.lastName,
		dateOfBirth: patient.dateOfBirth,
		phonePrimary: patient.phonePrimary,
		address: patient.address,
		photoPath: patient.photoPath,
		email: patient.user?.email ?? null,
		gender: patient.gender?.name ?? null,
		title: patient.title?.name ?? null
	};
}

export async function patchPatientProfile(
	ctx: PatientPortalContext,
	patch: {
		phonePrimary?: string;
		address?: string;
		photoPath?: string;
	}
) {
	const updates: Record<string, unknown> = {};
	if (patch.phonePrimary !== undefined) {
		updates.phonePrimary = patch.phonePrimary;
	}
	if (patch.address !== undefined) {
		updates.address = patch.address;
	}
	if (patch.photoPath !== undefined) {
		updates.photoPath = patch.photoPath;
	}
	if (Object.keys(updates).length === 0) {
		return await buildPatientMeDto(ctx);
	}
	await ensureDb()
		.update(table.patientTable)
		.set(updates)
		.where(eq(table.patientTable.id, ctx.patientId));
	const refreshed = await ensureDb().query.patientTable.findFirst({
		where: eq(table.patientTable.id, ctx.patientId),
		with: {
			user: true,
			title: true,
			gender: true,
			status: true,
			hospital: true,
			phonePrimaryCountry: true,
			city: true,
			state: true,
			country: true
		}
	});
	if (!refreshed) {
		throw new Error('Patient not found after update');
	}
	return await buildPatientMeDto({ ...ctx, patient: refreshed });
}
