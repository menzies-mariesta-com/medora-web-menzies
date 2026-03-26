import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/identity-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createIdentityType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createIdentityType', args);
	p.refresh = () => invokeOnce<any>('createIdentityType', args);
	return p;
};

export const deleteIdentityType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteIdentityType', args);
	p.refresh = () => invokeOnce<any>('deleteIdentityType', args);
	return p;
};

export const deleteIdentityTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteIdentityTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteIdentityTypeComplete', args);
	return p;
};

export const getIdentityType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getIdentityType', args);
	p.refresh = () => invokeOnce<any>('getIdentityType', args);
	return p;
};

export const getIdentityTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getIdentityTypeById', args);
	p.refresh = () => invokeOnce<any>('getIdentityTypeById', args);
	return p;
};

export const getIdentityTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getIdentityTypeCount', args);
	p.refresh = () => invokeOnce<any>('getIdentityTypeCount', args);
	return p;
};

export const getIdentityTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getIdentityTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getIdentityTypePaginated', args);
	return p;
};

export const updateIdentityType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateIdentityType', args);
	p.refresh = () => invokeOnce<any>('updateIdentityType', args);
	return p;
};

