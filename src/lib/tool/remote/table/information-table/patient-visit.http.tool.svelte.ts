import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-visit.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientVisit = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientVisit', args);
	p.refresh = () => invokeOnce<any>('createPatientVisit', args);
	return p;
};

export const getNextVisitNo = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNextVisitNo', args);
	p.refresh = () => invokeOnce<any>('getNextVisitNo', args);
	return p;
};

export const getPatientVisit = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVisit', args);
	p.refresh = () => invokeOnce<any>('getPatientVisit', args);
	return p;
};

export const getPatientVisitById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVisitById', args);
	p.refresh = () => invokeOnce<any>('getPatientVisitById', args);
	return p;
};

export const getPatientVisitByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVisitByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientVisitByIdWithRelations', args);
	return p;
};

export const getPatientVisitPaginatedForEmr = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVisitPaginatedForEmr', args);
	p.refresh = () => invokeOnce<any>('getPatientVisitPaginatedForEmr', args);
	return p;
};

export const getPatientVisitWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVisitWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientVisitWithRelations', args);
	return p;
};

export const updatePatientVisit = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientVisit', args);
	p.refresh = () => invokeOnce<any>('updatePatientVisit', args);
	return p;
};

