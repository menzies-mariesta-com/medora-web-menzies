import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/staff-department.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffDepartment', args);
	p.refresh = () => invokeOnce<any>('createStaffDepartment', args);
	return p;
};

export const deleteStaffDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffDepartment', args);
	p.refresh = () => invokeOnce<any>('deleteStaffDepartment', args);
	return p;
};

export const deleteStaffDepartmentComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffDepartmentComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffDepartmentComplete', args);
	return p;
};

export const getStaffDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDepartment', args);
	p.refresh = () => invokeOnce<any>('getStaffDepartment', args);
	return p;
};

export const getStaffDepartmentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDepartmentById', args);
	p.refresh = () => invokeOnce<any>('getStaffDepartmentById', args);
	return p;
};

export const getStaffDepartmentCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDepartmentCount', args);
	p.refresh = () => invokeOnce<any>('getStaffDepartmentCount', args);
	return p;
};

export const getStaffDepartmentPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDepartmentPaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffDepartmentPaginated', args);
	return p;
};

export const getStaffDepartmentWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffDepartmentWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffDepartmentWithRelations', args);
	return p;
};

export const updateStaffDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffDepartment', args);
	p.refresh = () => invokeOnce<any>('updateStaffDepartment', args);
	return p;
};

