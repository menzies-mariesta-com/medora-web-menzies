import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/staff-employment-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffEmploymentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffEmploymentType', args);
	p.refresh = () => invokeOnce<any>('createStaffEmploymentType', args);
	return p;
};

export const deleteStaffEmploymentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffEmploymentType', args);
	p.refresh = () => invokeOnce<any>('deleteStaffEmploymentType', args);
	return p;
};

export const deleteStaffEmploymentTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffEmploymentTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffEmploymentTypeComplete', args);
	return p;
};

export const getStaffEmploymentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffEmploymentType', args);
	p.refresh = () => invokeOnce<any>('getStaffEmploymentType', args);
	return p;
};

export const getStaffEmploymentTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffEmploymentTypeById', args);
	p.refresh = () => invokeOnce<any>('getStaffEmploymentTypeById', args);
	return p;
};

export const getStaffEmploymentTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffEmploymentTypeCount', args);
	p.refresh = () => invokeOnce<any>('getStaffEmploymentTypeCount', args);
	return p;
};

export const getStaffEmploymentTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffEmploymentTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffEmploymentTypePaginated', args);
	return p;
};

export const updateStaffEmploymentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffEmploymentType', args);
	p.refresh = () => invokeOnce<any>('updateStaffEmploymentType', args);
	return p;
};

