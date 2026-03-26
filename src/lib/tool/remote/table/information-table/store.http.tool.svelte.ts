import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/store.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStore = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStore', args);
	p.refresh = () => invokeOnce<any>('createStore', args);
	return p;
};

export const deleteStore = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStore', args);
	p.refresh = () => invokeOnce<any>('deleteStore', args);
	return p;
};

export const deleteStoreComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStoreComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStoreComplete', args);
	return p;
};

export const getStore = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStore', args);
	p.refresh = () => invokeOnce<any>('getStore', args);
	return p;
};

export const getStoreById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStoreById', args);
	p.refresh = () => invokeOnce<any>('getStoreById', args);
	return p;
};

export const getStoreCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStoreCount', args);
	p.refresh = () => invokeOnce<any>('getStoreCount', args);
	return p;
};

export const getStorePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStorePaginated', args);
	p.refresh = () => invokeOnce<any>('getStorePaginated', args);
	return p;
};

export const updateStore = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStore', args);
	p.refresh = () => invokeOnce<any>('updateStore', args);
	return p;
};

