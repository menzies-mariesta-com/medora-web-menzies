import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/city.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createCity = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createCity', args);
	p.refresh = () => invokeOnce<any>('createCity', args);
	return p;
};

export const deleteCity = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCity', args);
	p.refresh = () => invokeOnce<any>('deleteCity', args);
	return p;
};

export const deleteCityComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCityComplete', args);
	p.refresh = () => invokeOnce<any>('deleteCityComplete', args);
	return p;
};

export const getCity = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCity', args);
	p.refresh = () => invokeOnce<any>('getCity', args);
	return p;
};

export const getCityById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCityById', args);
	p.refresh = () => invokeOnce<any>('getCityById', args);
	return p;
};

export const getCityCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCityCount', args);
	p.refresh = () => invokeOnce<any>('getCityCount', args);
	return p;
};

export const getCityPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCityPaginated', args);
	p.refresh = () => invokeOnce<any>('getCityPaginated', args);
	return p;
};

export const updateCity = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateCity', args);
	p.refresh = () => invokeOnce<any>('updateCity', args);
	return p;
};

