import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

export type { StaffWithRelations } from '$lib/remote/table/information-table/staff.remote';

const moduleSuffix = 'table/information-table/staff.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaff = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaff', args);
	p.refresh = () => invokeOnce<any>('createStaff', args);
	return p;
};

export const createStaffWithUser = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffWithUser', args);
	p.refresh = () => invokeOnce<any>('createStaffWithUser', args);
	return p;
};

export const deleteStaff = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaff', args);
	p.refresh = () => invokeOnce<any>('deleteStaff', args);
	return p;
};

export const deleteStaffComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffComplete', args);
	return p;
};

export const getDoctorStaffList = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorStaffList', args);
	p.refresh = () => invokeOnce<any>('getDoctorStaffList', args);
	return p;
};

export const getDoctorStaffPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorStaffPaginated', args);
	p.refresh = () => invokeOnce<any>('getDoctorStaffPaginated', args);
	return p;
};

export const getStaff = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaff', args);
	p.refresh = () => invokeOnce<any>('getStaff', args);
	return p;
};

export const getStaffById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffById', args);
	p.refresh = () => invokeOnce<any>('getStaffById', args);
	return p;
};

export const getStaffByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffByIdWithRelations', args);
	return p;
};

export const getStaffByIdWithRelationsBatched = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffByIdWithRelationsBatched', args);
	p.refresh = () => invokeOnce<any>('getStaffByIdWithRelationsBatched', args);
	return p;
};

export const getStaffByUserId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffByUserId', args);
	p.refresh = () => invokeOnce<any>('getStaffByUserId', args);
	return p;
};

export const getStaffByUserIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffByUserIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffByUserIdWithRelations', args);
	return p;
};

export const getStaffCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffCount', args);
	p.refresh = () => invokeOnce<any>('getStaffCount', args);
	return p;
};

export const getStaffPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffPaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffPaginated', args);
	return p;
};

export const getStaffWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffWithRelations', args);
	return p;
};

export const updateStaff = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaff', args);
	p.refresh = () => invokeOnce<any>('updateStaff', args);
	return p;
};

