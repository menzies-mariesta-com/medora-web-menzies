import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-vital.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientVital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientVital', args);
	p.refresh = () => invokeOnce<any>('createPatientVital', args);
	return p;
};

export const deletePatientVital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientVital', args);
	p.refresh = () => invokeOnce<any>('deletePatientVital', args);
	return p;
};

export const getPatientVitalById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVitalById', args);
	p.refresh = () => invokeOnce<any>('getPatientVitalById', args);
	return p;
};

export const getPatientVitalsByPatientId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVitalsByPatientId', args);
	p.refresh = () => invokeOnce<any>('getPatientVitalsByPatientId', args);
	return p;
};

export const getPatientVitalsByPatientIdPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVitalsByPatientIdPaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientVitalsByPatientIdPaginated', args);
	return p;
};

export const getPatientVitalsByVisitId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientVitalsByVisitId', args);
	p.refresh = () => invokeOnce<any>('getPatientVitalsByVisitId', args);
	return p;
};

export const updatePatientVital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientVital', args);
	p.refresh = () => invokeOnce<any>('updatePatientVital', args);
	return p;
};

