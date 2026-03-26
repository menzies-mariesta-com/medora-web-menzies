import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/blood-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createBloodType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createBloodType', args);
	p.refresh = () => invokeOnce<any>('createBloodType', args);
	return p;
};

export const deleteBloodType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteBloodType', args);
	p.refresh = () => invokeOnce<any>('deleteBloodType', args);
	return p;
};

export const deleteBloodTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteBloodTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteBloodTypeComplete', args);
	return p;
};

export const getBloodType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBloodType', args);
	p.refresh = () => invokeOnce<any>('getBloodType', args);
	return p;
};

export const getBloodTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBloodTypeById', args);
	p.refresh = () => invokeOnce<any>('getBloodTypeById', args);
	return p;
};

export const getBloodTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBloodTypeCount', args);
	p.refresh = () => invokeOnce<any>('getBloodTypeCount', args);
	return p;
};

export const getBloodTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBloodTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getBloodTypePaginated', args);
	return p;
};

export const updateBloodType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateBloodType', args);
	p.refresh = () => invokeOnce<any>('updateBloodType', args);
	return p;
};

