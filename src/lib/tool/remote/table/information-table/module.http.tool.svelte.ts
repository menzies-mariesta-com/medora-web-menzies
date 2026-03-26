import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/module.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createModule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createModule', args);
	p.refresh = () => invokeOnce<any>('createModule', args);
	return p;
};

export const deleteModule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteModule', args);
	p.refresh = () => invokeOnce<any>('deleteModule', args);
	return p;
};

export const deleteModuleComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteModuleComplete', args);
	p.refresh = () => invokeOnce<any>('deleteModuleComplete', args);
	return p;
};

export const getModule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getModule', args);
	p.refresh = () => invokeOnce<any>('getModule', args);
	return p;
};

export const getModuleById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getModuleById', args);
	p.refresh = () => invokeOnce<any>('getModuleById', args);
	return p;
};

export const getModuleByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getModuleByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getModuleByIdWithRelations', args);
	return p;
};

export const getModuleCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getModuleCount', args);
	p.refresh = () => invokeOnce<any>('getModuleCount', args);
	return p;
};

export const getModulePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getModulePaginated', args);
	p.refresh = () => invokeOnce<any>('getModulePaginated', args);
	return p;
};

export const getModuleWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getModuleWithRelations', args);
	p.refresh = () => invokeOnce<any>('getModuleWithRelations', args);
	return p;
};

export const updateModule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateModule', args);
	p.refresh = () => invokeOnce<any>('updateModule', args);
	return p;
};

