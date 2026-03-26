import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-allergies.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientAllergies = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientAllergies', args);
	p.refresh = () => invokeOnce<any>('createPatientAllergies', args);
	return p;
};

export const deletePatientAllergies = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientAllergies', args);
	p.refresh = () => invokeOnce<any>('deletePatientAllergies', args);
	return p;
};

export const deletePatientAllergiesComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientAllergiesComplete', args);
	p.refresh = () => invokeOnce<any>('deletePatientAllergiesComplete', args);
	return p;
};

export const getActivePatientAllergiesByPatientId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getActivePatientAllergiesByPatientId', args);
	p.refresh = () => invokeOnce<any>('getActivePatientAllergiesByPatientId', args);
	return p;
};

export const getPatientAllergies = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergies', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergies', args);
	return p;
};

export const getPatientAllergiesById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesById', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesById', args);
	return p;
};

export const getPatientAllergiesByPatientId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesByPatientId', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesByPatientId', args);
	return p;
};

export const getPatientAllergiesByPatientIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesByPatientIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesByPatientIdWithRelations', args);
	return p;
};

export const getPatientAllergiesByPatientIdWithRelationsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesByPatientIdWithRelationsPaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesByPatientIdWithRelationsPaginated', args);
	return p;
};

export const getPatientAllergiesByVisitIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesByVisitIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesByVisitIdWithRelations', args);
	return p;
};

export const getPatientAllergiesCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesCount', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesCount', args);
	return p;
};

export const getPatientAllergiesPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesPaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesPaginated', args);
	return p;
};

export const getPatientAllergiesWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAllergiesWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientAllergiesWithRelations', args);
	return p;
};

export const inactivateAllPatientAllergiesForPatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('inactivateAllPatientAllergiesForPatient', args);
	p.refresh = () => invokeOnce<any>('inactivateAllPatientAllergiesForPatient', args);
	return p;
};

export const inactivateOtherPatientAllergiesForPatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('inactivateOtherPatientAllergiesForPatient', args);
	p.refresh = () => invokeOnce<any>('inactivateOtherPatientAllergiesForPatient', args);
	return p;
};

export const inactivatePatientAllergiesByAllergyIdForPatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('inactivatePatientAllergiesByAllergyIdForPatient', args);
	p.refresh = () => invokeOnce<any>('inactivatePatientAllergiesByAllergyIdForPatient', args);
	return p;
};

export const updatePatientAllergies = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientAllergies', args);
	p.refresh = () => invokeOnce<any>('updatePatientAllergies', args);
	return p;
};

