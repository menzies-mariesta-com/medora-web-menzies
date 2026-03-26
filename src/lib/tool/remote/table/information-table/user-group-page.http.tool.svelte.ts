import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/user-group-page.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createUserGroupPage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createUserGroupPage', args);
	p.refresh = () => invokeOnce<any>('createUserGroupPage', args);
	return p;
};

export const deleteUserGroupPage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteUserGroupPage', args);
	p.refresh = () => invokeOnce<any>('deleteUserGroupPage', args);
	return p;
};

export const deleteUserGroupPageComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteUserGroupPageComplete', args);
	p.refresh = () => invokeOnce<any>('deleteUserGroupPageComplete', args);
	return p;
};

export const getByUserGroupId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getByUserGroupId', args);
	p.refresh = () => invokeOnce<any>('getByUserGroupId', args);
	return p;
};

export const getUserGroupPage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupPage', args);
	p.refresh = () => invokeOnce<any>('getUserGroupPage', args);
	return p;
};

export const getUserGroupPageById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupPageById', args);
	p.refresh = () => invokeOnce<any>('getUserGroupPageById', args);
	return p;
};

export const getUserGroupPageCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupPageCount', args);
	p.refresh = () => invokeOnce<any>('getUserGroupPageCount', args);
	return p;
};

export const getUserGroupPagePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUserGroupPagePaginated', args);
	p.refresh = () => invokeOnce<any>('getUserGroupPagePaginated', args);
	return p;
};

export const setPagesForUserGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('setPagesForUserGroup', args);
	p.refresh = () => invokeOnce<any>('setPagesForUserGroup', args);
	return p;
};

export const updateUserGroupPage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateUserGroupPage', args);
	p.refresh = () => invokeOnce<any>('updateUserGroupPage', args);
	return p;
};

