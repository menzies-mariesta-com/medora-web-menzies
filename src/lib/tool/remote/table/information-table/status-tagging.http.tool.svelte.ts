import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/status-tagging.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStatusTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStatusTagging', args);
	p.refresh = () => invokeOnce<any>('createStatusTagging', args);
	return p;
};

export const deleteStatusTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStatusTagging', args);
	p.refresh = () => invokeOnce<any>('deleteStatusTagging', args);
	return p;
};

export const deleteStatusTaggingComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStatusTaggingComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStatusTaggingComplete', args);
	return p;
};

export const getStatusTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTagging', args);
	p.refresh = () => invokeOnce<any>('getStatusTagging', args);
	return p;
};

export const getStatusTaggingById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingById', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingById', args);
	return p;
};

export const getStatusTaggingCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingCount', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingCount', args);
	return p;
};

export const getStatusTaggingPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingPaginated', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingPaginated', args);
	return p;
};

export const getStatusTaggingWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStatusTaggingWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStatusTaggingWithRelations', args);
	return p;
};

export const updateStatusTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStatusTagging', args);
	p.refresh = () => invokeOnce<any>('updateStatusTagging', args);
	return p;
};

