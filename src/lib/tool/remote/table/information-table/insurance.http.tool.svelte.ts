import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/insurance.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createInsurance', args);
	p.refresh = () => invokeOnce<any>('createInsurance', args);
	return p;
};

export const deleteInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteInsurance', args);
	p.refresh = () => invokeOnce<any>('deleteInsurance', args);
	return p;
};

export const deleteInsuranceComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteInsuranceComplete', args);
	p.refresh = () => invokeOnce<any>('deleteInsuranceComplete', args);
	return p;
};

export const getInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getInsurance', args);
	p.refresh = () => invokeOnce<any>('getInsurance', args);
	return p;
};

export const getInsuranceById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getInsuranceById', args);
	p.refresh = () => invokeOnce<any>('getInsuranceById', args);
	return p;
};

export const getInsuranceCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getInsuranceCount', args);
	p.refresh = () => invokeOnce<any>('getInsuranceCount', args);
	return p;
};

export const getInsurancePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getInsurancePaginated', args);
	p.refresh = () => invokeOnce<any>('getInsurancePaginated', args);
	return p;
};

export const updateInsurance = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateInsurance', args);
	p.refresh = () => invokeOnce<any>('updateInsurance', args);
	return p;
};

