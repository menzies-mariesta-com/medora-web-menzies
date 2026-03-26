import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/status.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStatus', args);
	p.refresh = () => invokeOnce<any>('createStatus', args);
	return p;
};

export const deleteStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStatus', args);
	p.refresh = () => invokeOnce<any>('deleteStatus', args);
	return p;
};

export const deleteStatusComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStatusComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStatusComplete', args);
	return p;
};

export const getStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatus', args);
	p.refresh = () => invokeOnce<any>('getStatus', args);
	return p;
};

export const getStatusById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusById', args);
	p.refresh = () => invokeOnce<any>('getStatusById', args);
	return p;
};

export const getStatusCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusCount', args);
	p.refresh = () => invokeOnce<any>('getStatusCount', args);
	return p;
};

export const getStatusPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusPaginated', args);
	p.refresh = () => invokeOnce<any>('getStatusPaginated', args);
	return p;
};

export const updateStatus = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStatus', args);
	p.refresh = () => invokeOnce<any>('updateStatus', args);
	return p;
};

