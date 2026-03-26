import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/diagnosis.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createDiagnosis = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createDiagnosis', args);
	p.refresh = () => invokeOnce<any>('createDiagnosis', args);
	return p;
};

export const deleteDiagnosis = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDiagnosis', args);
	p.refresh = () => invokeOnce<any>('deleteDiagnosis', args);
	return p;
};

export const getDiagnosesByVisitId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDiagnosesByVisitId', args);
	p.refresh = () => invokeOnce<any>('getDiagnosesByVisitId', args);
	return p;
};

export const getDiagnosisById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDiagnosisById', args);
	p.refresh = () => invokeOnce<any>('getDiagnosisById', args);
	return p;
};

export const getDiagnosisTypes = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDiagnosisTypes', args);
	p.refresh = () => invokeOnce<any>('getDiagnosisTypes', args);
	return p;
};

export const updateDiagnosis = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateDiagnosis', args);
	p.refresh = () => invokeOnce<any>('updateDiagnosis', args);
	return p;
};

