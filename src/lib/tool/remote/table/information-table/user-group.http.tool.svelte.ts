import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/user-group.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createUserGroup', args);
	p.refresh = () => invokeOnce<any>('createUserGroup', args);
	return p;
};

export const deleteUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteUserGroup', args);
	p.refresh = () => invokeOnce<any>('deleteUserGroup', args);
	return p;
};

export const deleteUserGroupComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteUserGroupComplete', args);
	p.refresh = () => invokeOnce<any>('deleteUserGroupComplete', args);
	return p;
};

export const getUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroup', args);
	p.refresh = () => invokeOnce<any>('getUserGroup', args);
	return p;
};

export const getUserGroupByHospitalId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupByHospitalId', args);
	p.refresh = () => invokeOnce<any>('getUserGroupByHospitalId', args);
	return p;
};

export const getUserGroupById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupById', args);
	p.refresh = () => invokeOnce<any>('getUserGroupById', args);
	return p;
};

export const getUserGroupByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getUserGroupByIdWithRelations', args);
	return p;
};

export const getUserGroupCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupCount', args);
	p.refresh = () => invokeOnce<any>('getUserGroupCount', args);
	return p;
};

export const getUserGroupPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupPaginated', args);
	p.refresh = () => invokeOnce<any>('getUserGroupPaginated', args);
	return p;
};

export const getUserGroupWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupWithRelations', args);
	p.refresh = () => invokeOnce<any>('getUserGroupWithRelations', args);
	return p;
};

export const updateUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateUserGroup', args);
	p.refresh = () => invokeOnce<any>('updateUserGroup', args);
	return p;
};

