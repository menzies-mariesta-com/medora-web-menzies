import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/document-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createDocumentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createDocumentType', args);
	p.refresh = () => invokeOnce<any>('createDocumentType', args);
	return p;
};

export const deleteDocumentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDocumentType', args);
	p.refresh = () => invokeOnce<any>('deleteDocumentType', args);
	return p;
};

export const getDocumentTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentTypeById', args);
	p.refresh = () => invokeOnce<any>('getDocumentTypeById', args);
	return p;
};

export const getDocumentTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentTypeCount', args);
	p.refresh = () => invokeOnce<any>('getDocumentTypeCount', args);
	return p;
};

export const getDocumentTypes = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentTypes', args);
	p.refresh = () => invokeOnce<any>('getDocumentTypes', args);
	return p;
};

export const getDocumentTypesPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentTypesPaginated', args);
	p.refresh = () => invokeOnce<any>('getDocumentTypesPaginated', args);
	return p;
};

export const updateDocumentType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateDocumentType', args);
	p.refresh = () => invokeOnce<any>('updateDocumentType', args);
	return p;
};

