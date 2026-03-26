import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/external-refer.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createExternalRefer = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createExternalRefer', args);
	p.refresh = () => invokeOnce<any>('createExternalRefer', args);
	return p;
};

export const deleteExternalRefer = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteExternalRefer', args);
	p.refresh = () => invokeOnce<any>('deleteExternalRefer', args);
	return p;
};

export const deleteExternalReferComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteExternalReferComplete', args);
	p.refresh = () => invokeOnce<any>('deleteExternalReferComplete', args);
	return p;
};

export const getExternalRefer = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getExternalRefer', args);
	p.refresh = () => invokeOnce<any>('getExternalRefer', args);
	return p;
};

export const getExternalReferById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getExternalReferById', args);
	p.refresh = () => invokeOnce<any>('getExternalReferById', args);
	return p;
};

export const getExternalReferByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getExternalReferByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getExternalReferByIdWithRelations', args);
	return p;
};

export const getExternalReferCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getExternalReferCount', args);
	p.refresh = () => invokeOnce<any>('getExternalReferCount', args);
	return p;
};

export const getExternalReferPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getExternalReferPaginated', args);
	p.refresh = () => invokeOnce<any>('getExternalReferPaginated', args);
	return p;
};

export const getExternalReferWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getExternalReferWithRelations', args);
	p.refresh = () => invokeOnce<any>('getExternalReferWithRelations', args);
	return p;
};

export const updateExternalRefer = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateExternalRefer', args);
	p.refresh = () => invokeOnce<any>('updateExternalRefer', args);
	return p;
};

