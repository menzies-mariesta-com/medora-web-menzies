import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/marial-status.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createMaritalStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createMaritalStatus', args);
	p.refresh = () => invokeOnce<any>('createMaritalStatus', args);
	return p;
};

export const deleteMaritalStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteMaritalStatus', args);
	p.refresh = () => invokeOnce<any>('deleteMaritalStatus', args);
	return p;
};

export const deleteMaritalStatusComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteMaritalStatusComplete', args);
	p.refresh = () => invokeOnce<any>('deleteMaritalStatusComplete', args);
	return p;
};

export const getMaritalStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMaritalStatus', args);
	p.refresh = () => invokeOnce<any>('getMaritalStatus', args);
	return p;
};

export const getMaritalStatusById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMaritalStatusById', args);
	p.refresh = () => invokeOnce<any>('getMaritalStatusById', args);
	return p;
};

export const getMaritalStatusCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMaritalStatusCount', args);
	p.refresh = () => invokeOnce<any>('getMaritalStatusCount', args);
	return p;
};

export const getMaritalStatusPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMaritalStatusPaginated', args);
	p.refresh = () => invokeOnce<any>('getMaritalStatusPaginated', args);
	return p;
};

export const updateMaritalStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateMaritalStatus', args);
	p.refresh = () => invokeOnce<any>('updateMaritalStatus', args);
	return p;
};

