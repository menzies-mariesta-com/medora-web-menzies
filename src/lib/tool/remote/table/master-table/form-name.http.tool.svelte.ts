import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/form-name.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createFormName = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createFormName', args);
	p.refresh = () => invokeOnce<any>('createFormName', args);
	return p;
};

export const deleteFormName = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteFormName', args);
	p.refresh = () => invokeOnce<any>('deleteFormName', args);
	return p;
};

export const getFormName = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFormName', args);
	p.refresh = () => invokeOnce<any>('getFormName', args);
	return p;
};

export const getFormNameByCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFormNameByCode', args);
	p.refresh = () => invokeOnce<any>('getFormNameByCode', args);
	return p;
};

export const getFormNameByFormType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFormNameByFormType', args);
	p.refresh = () => invokeOnce<any>('getFormNameByFormType', args);
	return p;
};

export const getFormNameById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFormNameById', args);
	p.refresh = () => invokeOnce<any>('getFormNameById', args);
	return p;
};

export const getFormNameCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFormNameCount', args);
	p.refresh = () => invokeOnce<any>('getFormNameCount', args);
	return p;
};

export const getFormNamePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getFormNamePaginated', args);
	p.refresh = () => invokeOnce<any>('getFormNamePaginated', args);
	return p;
};

export const updateFormName = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateFormName', args);
	p.refresh = () => invokeOnce<any>('updateFormName', args);
	return p;
};

