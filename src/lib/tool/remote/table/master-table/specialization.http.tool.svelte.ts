import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/specialization.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createSpecialization = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createSpecialization', args);
	p.refresh = () => invokeOnce<any>('createSpecialization', args);
	return p;
};

export const deleteSpecialization = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteSpecialization', args);
	p.refresh = () => invokeOnce<any>('deleteSpecialization', args);
	return p;
};

export const deleteSpecializationComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteSpecializationComplete', args);
	p.refresh = () => invokeOnce<any>('deleteSpecializationComplete', args);
	return p;
};

export const getSpecialization = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSpecialization', args);
	p.refresh = () => invokeOnce<any>('getSpecialization', args);
	return p;
};

export const getSpecializationById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSpecializationById', args);
	p.refresh = () => invokeOnce<any>('getSpecializationById', args);
	return p;
};

export const getSpecializationCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSpecializationCount', args);
	p.refresh = () => invokeOnce<any>('getSpecializationCount', args);
	return p;
};

export const getSpecializationPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSpecializationPaginated', args);
	p.refresh = () => invokeOnce<any>('getSpecializationPaginated', args);
	return p;
};

export const getSpecializationWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSpecializationWithRelations', args);
	p.refresh = () => invokeOnce<any>('getSpecializationWithRelations', args);
	return p;
};

export const updateSpecialization = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateSpecialization', args);
	p.refresh = () => invokeOnce<any>('updateSpecialization', args);
	return p;
};

