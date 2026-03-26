import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/title.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createTitle = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createTitle', args);
	p.refresh = () => invokeOnce<any>('createTitle', args);
	return p;
};

export const deleteTitle = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteTitle', args);
	p.refresh = () => invokeOnce<any>('deleteTitle', args);
	return p;
};

export const deleteTitleComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteTitleComplete', args);
	p.refresh = () => invokeOnce<any>('deleteTitleComplete', args);
	return p;
};

export const getTitle = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getTitle', args);
	p.refresh = () => invokeOnce<any>('getTitle', args);
	return p;
};

export const getTitleById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getTitleById', args);
	p.refresh = () => invokeOnce<any>('getTitleById', args);
	return p;
};

export const getTitleCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getTitleCount', args);
	p.refresh = () => invokeOnce<any>('getTitleCount', args);
	return p;
};

export const getTitlePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getTitlePaginated', args);
	p.refresh = () => invokeOnce<any>('getTitlePaginated', args);
	return p;
};

export const updateTitle = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateTitle', args);
	p.refresh = () => invokeOnce<any>('updateTitle', args);
	return p;
};

