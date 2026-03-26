import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/department.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createDepartment', args);
	p.refresh = () => invokeOnce<any>('createDepartment', args);
	return p;
};

export const deleteDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDepartment', args);
	p.refresh = () => invokeOnce<any>('deleteDepartment', args);
	return p;
};

export const deleteDepartmentComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDepartmentComplete', args);
	p.refresh = () => invokeOnce<any>('deleteDepartmentComplete', args);
	return p;
};

export const getDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDepartment', args);
	p.refresh = () => invokeOnce<any>('getDepartment', args);
	return p;
};

export const getDepartmentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDepartmentById', args);
	p.refresh = () => invokeOnce<any>('getDepartmentById', args);
	return p;
};

export const getDepartmentCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDepartmentCount', args);
	p.refresh = () => invokeOnce<any>('getDepartmentCount', args);
	return p;
};

export const getDepartmentPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDepartmentPaginated', args);
	p.refresh = () => invokeOnce<any>('getDepartmentPaginated', args);
	return p;
};

export const updateDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateDepartment', args);
	p.refresh = () => invokeOnce<any>('updateDepartment', args);
	return p;
};

