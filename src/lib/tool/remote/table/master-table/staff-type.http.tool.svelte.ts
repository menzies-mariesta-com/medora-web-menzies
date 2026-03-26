import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/staff-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffType', args);
	p.refresh = () => invokeOnce<any>('createStaffType', args);
	return p;
};

export const deleteStaffType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffType', args);
	p.refresh = () => invokeOnce<any>('deleteStaffType', args);
	return p;
};

export const deleteStaffTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffTypeComplete', args);
	return p;
};

export const getStaffType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffType', args);
	p.refresh = () => invokeOnce<any>('getStaffType', args);
	return p;
};

export const getStaffTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffTypeById', args);
	p.refresh = () => invokeOnce<any>('getStaffTypeById', args);
	return p;
};

export const getStaffTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffTypeCount', args);
	p.refresh = () => invokeOnce<any>('getStaffTypeCount', args);
	return p;
};

export const getStaffTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffTypePaginated', args);
	return p;
};

export const updateStaffType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffType', args);
	p.refresh = () => invokeOnce<any>('updateStaffType', args);
	return p;
};

