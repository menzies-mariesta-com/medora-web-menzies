import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/category.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createCategory', args);
	p.refresh = () => invokeOnce<any>('createCategory', args);
	return p;
};

export const deleteCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCategory', args);
	p.refresh = () => invokeOnce<any>('deleteCategory', args);
	return p;
};

export const deleteCategoryComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCategoryComplete', args);
	p.refresh = () => invokeOnce<any>('deleteCategoryComplete', args);
	return p;
};

export const getCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCategory', args);
	p.refresh = () => invokeOnce<any>('getCategory', args);
	return p;
};

export const getCategoryById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCategoryById', args);
	p.refresh = () => invokeOnce<any>('getCategoryById', args);
	return p;
};

export const getCategoryCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCategoryCount', args);
	p.refresh = () => invokeOnce<any>('getCategoryCount', args);
	return p;
};

export const getCategoryPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCategoryPaginated', args);
	p.refresh = () => invokeOnce<any>('getCategoryPaginated', args);
	return p;
};

export const updateCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateCategory', args);
	p.refresh = () => invokeOnce<any>('updateCategory', args);
	return p;
};

