import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/status-tagging-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStatusTaggingType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStatusTaggingType', args);
	p.refresh = () => invokeOnce<any>('createStatusTaggingType', args);
	return p;
};

export const deleteStatusTaggingType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStatusTaggingType', args);
	p.refresh = () => invokeOnce<any>('deleteStatusTaggingType', args);
	return p;
};

export const deleteStatusTaggingTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStatusTaggingTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStatusTaggingTypeComplete', args);
	return p;
};

export const getStatusTaggingType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingType', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingType', args);
	return p;
};

export const getStatusTaggingTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingTypeById', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingTypeById', args);
	return p;
};

export const getStatusTaggingTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingTypeCount', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingTypeCount', args);
	return p;
};

export const getStatusTaggingTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingTypePaginated', args);
	return p;
};

export const getStatusTaggingTypeWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingTypeWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingTypeWithRelations', args);
	return p;
};

export const updateStatusTaggingType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStatusTaggingType', args);
	p.refresh = () => invokeOnce<any>('updateStatusTaggingType', args);
	return p;
};

