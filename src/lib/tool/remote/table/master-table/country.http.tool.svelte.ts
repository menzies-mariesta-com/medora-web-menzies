import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/country.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createCountry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createCountry', args);
	p.refresh = () => invokeOnce<any>('createCountry', args);
	return p;
};

export const deleteCountry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCountry', args);
	p.refresh = () => invokeOnce<any>('deleteCountry', args);
	return p;
};

export const deleteCountryComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCountryComplete', args);
	p.refresh = () => invokeOnce<any>('deleteCountryComplete', args);
	return p;
};

export const getCountry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCountry', args);
	p.refresh = () => invokeOnce<any>('getCountry', args);
	return p;
};

export const getCountryById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCountryById', args);
	p.refresh = () => invokeOnce<any>('getCountryById', args);
	return p;
};

export const getCountryCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCountryCount', args);
	p.refresh = () => invokeOnce<any>('getCountryCount', args);
	return p;
};

export const getCountryPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCountryPaginated', args);
	p.refresh = () => invokeOnce<any>('getCountryPaginated', args);
	return p;
};

export const updateCountry = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateCountry', args);
	p.refresh = () => invokeOnce<any>('updateCountry', args);
	return p;
};

