import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/financial-year.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const getFinancialYearByHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFinancialYearByHospital', args);
	p.refresh = () => invokeOnce<any>('getFinancialYearByHospital', args);
	return p;
};

export const getFinancialYearById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFinancialYearById', args);
	p.refresh = () => invokeOnce<any>('getFinancialYearById', args);
	return p;
};

export const createFinancialYear = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createFinancialYear', args);
	p.refresh = () => invokeOnce<any>('createFinancialYear', args);
	return p;
};

export const updateFinancialYear = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateFinancialYear', args);
	p.refresh = () => invokeOnce<any>('updateFinancialYear', args);
	return p;
};

export const deleteFinancialYear = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteFinancialYear', args);
	p.refresh = () => invokeOnce<any>('deleteFinancialYear', args);
	return p;
};

