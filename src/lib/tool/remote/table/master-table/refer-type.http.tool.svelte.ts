import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/refer-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createReferType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createReferType', args);
	p.refresh = () => invokeOnce<any>('createReferType', args);
	return p;
};

export const deleteReferType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteReferType', args);
	p.refresh = () => invokeOnce<any>('deleteReferType', args);
	return p;
};

export const deleteReferTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteReferTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteReferTypeComplete', args);
	return p;
};

export const getReferType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferType', args);
	p.refresh = () => invokeOnce<any>('getReferType', args);
	return p;
};

export const getReferTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferTypeById', args);
	p.refresh = () => invokeOnce<any>('getReferTypeById', args);
	return p;
};

export const getReferTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferTypeCount', args);
	p.refresh = () => invokeOnce<any>('getReferTypeCount', args);
	return p;
};

export const getReferTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getReferTypePaginated', args);
	return p;
};

export const updateReferType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateReferType', args);
	p.refresh = () => invokeOnce<any>('updateReferType', args);
	return p;
};

