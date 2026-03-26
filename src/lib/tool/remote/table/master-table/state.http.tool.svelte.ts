import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/state.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createState = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createState', args);
	p.refresh = () => invokeOnce<any>('createState', args);
	return p;
};

export const deleteState = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteState', args);
	p.refresh = () => invokeOnce<any>('deleteState', args);
	return p;
};

export const deleteStateComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStateComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStateComplete', args);
	return p;
};

export const getState = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getState', args);
	p.refresh = () => invokeOnce<any>('getState', args);
	return p;
};

export const getStateById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStateById', args);
	p.refresh = () => invokeOnce<any>('getStateById', args);
	return p;
};

export const getStateCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStateCount', args);
	p.refresh = () => invokeOnce<any>('getStateCount', args);
	return p;
};

export const getStatePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatePaginated', args);
	p.refresh = () => invokeOnce<any>('getStatePaginated', args);
	return p;
};

export const updateState = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateState', args);
	p.refresh = () => invokeOnce<any>('updateState', args);
	return p;
};

