import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-insurance.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientInsurance', args);
	p.refresh = () => invokeOnce<any>('createPatientInsurance', args);
	return p;
};

export const deletePatientInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientInsurance', args);
	p.refresh = () => invokeOnce<any>('deletePatientInsurance', args);
	return p;
};

export const deletePatientInsuranceComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientInsuranceComplete', args);
	p.refresh = () => invokeOnce<any>('deletePatientInsuranceComplete', args);
	return p;
};

export const getPatientInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientInsurance', args);
	p.refresh = () => invokeOnce<any>('getPatientInsurance', args);
	return p;
};

export const getPatientInsuranceById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientInsuranceById', args);
	p.refresh = () => invokeOnce<any>('getPatientInsuranceById', args);
	return p;
};

export const getPatientInsuranceCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientInsuranceCount', args);
	p.refresh = () => invokeOnce<any>('getPatientInsuranceCount', args);
	return p;
};

export const getPatientInsurancePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientInsurancePaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientInsurancePaginated', args);
	return p;
};

export const getPatientInsuranceWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientInsuranceWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientInsuranceWithRelations', args);
	return p;
};

export const updatePatientInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientInsurance', args);
	p.refresh = () => invokeOnce<any>('updatePatientInsurance', args);
	return p;
};

