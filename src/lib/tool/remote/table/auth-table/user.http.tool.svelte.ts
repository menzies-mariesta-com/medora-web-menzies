import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/auth-table/user.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createOwner = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createOwner', args);
	p.refresh = () => invokeOnce<any>('createOwner', args);
	return p;
};

export const deleteUser = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteUser', args);
	p.refresh = () => invokeOnce<any>('deleteUser', args);
	return p;
};

export const getUser = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUser', args);
	p.refresh = () => invokeOnce<any>('getUser', args);
	return p;
};

export const getUserById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserById', args);
	p.refresh = () => invokeOnce<any>('getUserById', args);
	return p;
};

export const getUserByIdWithStaff = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserByIdWithStaff', args);
	p.refresh = () => invokeOnce<any>('getUserByIdWithStaff', args);
	return p;
};

export const getUserCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserCount', args);
	p.refresh = () => invokeOnce<any>('getUserCount', args);
	return p;
};

export const getUserPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserPaginated', args);
	p.refresh = () => invokeOnce<any>('getUserPaginated', args);
	return p;
};

export const getUserWithStaff = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserWithStaff', args);
	p.refresh = () => invokeOnce<any>('getUserWithStaff', args);
	return p;
};

export const getUsersByRole = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUsersByRole', args);
	p.refresh = () => invokeOnce<any>('getUsersByRole', args);
	return p;
};

export const getUsersByRolePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUsersByRolePaginated', args);
	p.refresh = () => invokeOnce<any>('getUsersByRolePaginated', args);
	return p;
};

export const updateUser = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateUser', args);
	p.refresh = () => invokeOnce<any>('updateUser', args);
	return p;
};

