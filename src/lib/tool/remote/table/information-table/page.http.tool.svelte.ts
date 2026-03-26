import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/page.remote.ts';

function invokeOnce<T>(
	fn: string,
	args: unknown[],
	fetchFn?: typeof fetch
): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	}, fetchFn);
}

export const createPage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPage', args);
	p.refresh = () => invokeOnce<any>('createPage', args);
	return p;
};

export const deletePage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePage', args);
	p.refresh = () => invokeOnce<any>('deletePage', args);
	return p;
};

export const deletePageComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePageComplete', args);
	p.refresh = () => invokeOnce<any>('deletePageComplete', args);
	return p;
};

export const getPage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPage', args);
	p.refresh = () => invokeOnce<any>('getPage', args);
	return p;
};

export const getPageWithFetch = (fetchFn: typeof fetch, ...args: any[]): any => {
	const p: any = invokeOnce<any>('getPage', args, fetchFn);
	p.refresh = () => invokeOnce<any>('getPage', args, fetchFn);
	return p;
};

export const getPageById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPageById', args);
	p.refresh = () => invokeOnce<any>('getPageById', args);
	return p;
};

export const getPageCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPageCount', args);
	p.refresh = () => invokeOnce<any>('getPageCount', args);
	return p;
};

export const getPagePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPagePaginated', args);
	p.refresh = () => invokeOnce<any>('getPagePaginated', args);
	return p;
};

export const getPageWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPageWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPageWithRelations', args);
	return p;
};

export const updatePage = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePage', args);
	p.refresh = () => invokeOnce<any>('updatePage', args);
	return p;
};

