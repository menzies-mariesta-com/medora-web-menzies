import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/staff-detail.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffDetail', args);
	p.refresh = () => invokeOnce<any>('createStaffDetail', args);
	return p;
};

export const deleteStaffDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffDetail', args);
	p.refresh = () => invokeOnce<any>('deleteStaffDetail', args);
	return p;
};

export const deleteStaffDetailComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffDetailComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffDetailComplete', args);
	return p;
};

export const getStaffDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDetail', args);
	p.refresh = () => invokeOnce<any>('getStaffDetail', args);
	return p;
};

export const getStaffDetailById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDetailById', args);
	p.refresh = () => invokeOnce<any>('getStaffDetailById', args);
	return p;
};

export const getStaffDetailByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDetailByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffDetailByIdWithRelations', args);
	return p;
};

export const getStaffDetailCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDetailCount', args);
	p.refresh = () => invokeOnce<any>('getStaffDetailCount', args);
	return p;
};

export const getStaffDetailPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDetailPaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffDetailPaginated', args);
	return p;
};

export const getStaffDetailWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDetailWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffDetailWithRelations', args);
	return p;
};

export const updateStaffDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffDetail', args);
	p.refresh = () => invokeOnce<any>('updateStaffDetail', args);
	return p;
};

