import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/staff-user-group.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffUserGroup', args);
	p.refresh = () => invokeOnce<any>('createStaffUserGroup', args);
	return p;
};

export const deleteStaffUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffUserGroup', args);
	p.refresh = () => invokeOnce<any>('deleteStaffUserGroup', args);
	return p;
};

export const deleteStaffUserGroupComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffUserGroupComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffUserGroupComplete', args);
	return p;
};

export const getStaffUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffUserGroup', args);
	p.refresh = () => invokeOnce<any>('getStaffUserGroup', args);
	return p;
};

export const getStaffUserGroupById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffUserGroupById', args);
	p.refresh = () => invokeOnce<any>('getStaffUserGroupById', args);
	return p;
};

export const getStaffUserGroupByStaffAndHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffUserGroupByStaffAndHospital', args);
	p.refresh = () => invokeOnce<any>('getStaffUserGroupByStaffAndHospital', args);
	return p;
};

export const getStaffUserGroupCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffUserGroupCount', args);
	p.refresh = () => invokeOnce<any>('getStaffUserGroupCount', args);
	return p;
};

export const getStaffUserGroupPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffUserGroupPaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffUserGroupPaginated', args);
	return p;
};

export const getStaffUserGroupWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffUserGroupWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffUserGroupWithRelations', args);
	return p;
};

export const updateStaffUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffUserGroup', args);
	p.refresh = () => invokeOnce<any>('updateStaffUserGroup', args);
	return p;
};

