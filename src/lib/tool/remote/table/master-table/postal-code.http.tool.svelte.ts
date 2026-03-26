import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/postal-code.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPostalCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPostalCode', args);
	p.refresh = () => invokeOnce<any>('createPostalCode', args);
	return p;
};

export const deletePostalCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePostalCode', args);
	p.refresh = () => invokeOnce<any>('deletePostalCode', args);
	return p;
};

export const deletePostalCodeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePostalCodeComplete', args);
	p.refresh = () => invokeOnce<any>('deletePostalCodeComplete', args);
	return p;
};

export const getPostalCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPostalCode', args);
	p.refresh = () => invokeOnce<any>('getPostalCode', args);
	return p;
};

export const getPostalCodeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPostalCodeById', args);
	p.refresh = () => invokeOnce<any>('getPostalCodeById', args);
	return p;
};

export const getPostalCodeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPostalCodeCount', args);
	p.refresh = () => invokeOnce<any>('getPostalCodeCount', args);
	return p;
};

export const getPostalCodePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPostalCodePaginated', args);
	p.refresh = () => invokeOnce<any>('getPostalCodePaginated', args);
	return p;
};

export const updatePostalCode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePostalCode', args);
	p.refresh = () => invokeOnce<any>('updatePostalCode', args);
	return p;
};

