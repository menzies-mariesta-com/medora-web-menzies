import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/auth-table/role.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createRole = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createRole', args);
	p.refresh = () => invokeOnce<any>('createRole', args);
	return p;
};

export const deleteRole = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteRole', args);
	p.refresh = () => invokeOnce<any>('deleteRole', args);
	return p;
};

export const deleteRoleComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteRoleComplete', args);
	p.refresh = () => invokeOnce<any>('deleteRoleComplete', args);
	return p;
};

export const getRole = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getRole', args);
	p.refresh = () => invokeOnce<any>('getRole', args);
	return p;
};

export const getRoleById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getRoleById', args);
	p.refresh = () => invokeOnce<any>('getRoleById', args);
	return p;
};

export const getRoleCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getRoleCount', args);
	p.refresh = () => invokeOnce<any>('getRoleCount', args);
	return p;
};

export const getRolePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getRolePaginated', args);
	p.refresh = () => invokeOnce<any>('getRolePaginated', args);
	return p;
};

export const getRoleWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getRoleWithRelations', args);
	p.refresh = () => invokeOnce<any>('getRoleWithRelations', args);
	return p;
};

export const updateRole = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateRole', args);
	p.refresh = () => invokeOnce<any>('updateRole', args);
	return p;
};

