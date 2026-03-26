import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/document.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createDocument', args);
	p.refresh = () => invokeOnce<any>('createDocument', args);
	return p;
};

export const deleteDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDocument', args);
	p.refresh = () => invokeOnce<any>('deleteDocument', args);
	return p;
};

export const getDocumentByCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentByCode', args);
	p.refresh = () => invokeOnce<any>('getDocumentByCode', args);
	return p;
};

export const getDocumentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentById', args);
	p.refresh = () => invokeOnce<any>('getDocumentById', args);
	return p;
};

export const getDocuments = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocuments', args);
	p.refresh = () => invokeOnce<any>('getDocuments', args);
	return p;
};

export const getDocumentsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentsPaginated', args);
	p.refresh = () => invokeOnce<any>('getDocumentsPaginated', args);
	return p;
};

export const getDocumentsPaginatedWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentsPaginatedWithRelations', args);
	p.refresh = () => invokeOnce<any>('getDocumentsPaginatedWithRelations', args);
	return p;
};

export const getDocumentsWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentsWithRelations', args);
	p.refresh = () => invokeOnce<any>('getDocumentsWithRelations', args);
	return p;
};

export const updateDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateDocument', args);
	p.refresh = () => invokeOnce<any>('updateDocument', args);
	return p;
};

