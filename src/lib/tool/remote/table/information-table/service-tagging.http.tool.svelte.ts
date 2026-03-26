import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/service-tagging.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createServiceTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createServiceTagging', args);
	p.refresh = () => invokeOnce<any>('createServiceTagging', args);
	return p;
};

export const deleteServiceTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceTagging', args);
	p.refresh = () => invokeOnce<any>('deleteServiceTagging', args);
	return p;
};

export const deleteServiceTaggingComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceTaggingComplete', args);
	p.refresh = () => invokeOnce<any>('deleteServiceTaggingComplete', args);
	return p;
};

export const getServiceTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceTagging', args);
	p.refresh = () => invokeOnce<any>('getServiceTagging', args);
	return p;
};

export const getServiceTaggingById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceTaggingById', args);
	p.refresh = () => invokeOnce<any>('getServiceTaggingById', args);
	return p;
};

export const getServiceTaggingCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceTaggingCount', args);
	p.refresh = () => invokeOnce<any>('getServiceTaggingCount', args);
	return p;
};

export const getServiceTaggingPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceTaggingPaginated', args);
	p.refresh = () => invokeOnce<any>('getServiceTaggingPaginated', args);
	return p;
};

export const updateServiceTagging = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateServiceTagging', args);
	p.refresh = () => invokeOnce<any>('updateServiceTagging', args);
	return p;
};

