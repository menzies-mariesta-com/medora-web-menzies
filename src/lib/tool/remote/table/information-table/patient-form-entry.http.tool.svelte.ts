import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-form-entry.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientFormEntry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientFormEntry', args);
	p.refresh = () => invokeOnce<any>('createPatientFormEntry', args);
	return p;
};

export const deletePatientFormEntry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientFormEntry', args);
	p.refresh = () => invokeOnce<any>('deletePatientFormEntry', args);
	return p;
};

export const getPatientFormEntriesByVisitIdAndFormCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientFormEntriesByVisitIdAndFormCode', args);
	p.refresh = () => invokeOnce<any>('getPatientFormEntriesByVisitIdAndFormCode', args);
	return p;
};

export const getPatientFormEntryById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientFormEntryById', args);
	p.refresh = () => invokeOnce<any>('getPatientFormEntryById', args);
	return p;
};

export const updatePatientFormEntry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientFormEntry', args);
	p.refresh = () => invokeOnce<any>('updatePatientFormEntry', args);
	return p;
};

