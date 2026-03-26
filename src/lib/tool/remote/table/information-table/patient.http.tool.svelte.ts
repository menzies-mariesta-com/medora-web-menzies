import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatient', args);
	p.refresh = () => invokeOnce<any>('createPatient', args);
	return p;
};

export const createPatientWithUser = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientWithUser', args);
	p.refresh = () => invokeOnce<any>('createPatientWithUser', args);
	return p;
};

export const deletePatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatient', args);
	p.refresh = () => invokeOnce<any>('deletePatient', args);
	return p;
};

export const deletePatientComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientComplete', args);
	p.refresh = () => invokeOnce<any>('deletePatientComplete', args);
	return p;
};

export const getDuplicatePatients = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDuplicatePatients', args);
	p.refresh = () => invokeOnce<any>('getDuplicatePatients', args);
	return p;
};

export const getNextPatientCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNextPatientCode', args);
	p.refresh = () => invokeOnce<any>('getNextPatientCode', args);
	return p;
};

export const getPatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatient', args);
	p.refresh = () => invokeOnce<any>('getPatient', args);
	return p;
};

export const getPatientById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientById', args);
	p.refresh = () => invokeOnce<any>('getPatientById', args);
	return p;
};

export const getPatientByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientByIdWithRelations', args);
	return p;
};

export const getPatientCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientCount', args);
	p.refresh = () => invokeOnce<any>('getPatientCount', args);
	return p;
};

export const getPatientPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientPaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientPaginated', args);
	return p;
};

export const getPatientWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientWithRelations', args);
	return p;
};

export const updatePatient = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatient', args);
	p.refresh = () => invokeOnce<any>('updatePatient', args);
	return p;
};

export type { PatientWithRelations } from '$lib/remote/table/information-table/patient.remote';
