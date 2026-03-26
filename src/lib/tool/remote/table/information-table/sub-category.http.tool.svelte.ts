import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/sub-category.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createSubCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createSubCategory', args);
	p.refresh = () => invokeOnce<any>('createSubCategory', args);
	return p;
};

export const deleteSubCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteSubCategory', args);
	p.refresh = () => invokeOnce<any>('deleteSubCategory', args);
	return p;
};

export const deleteSubCategoryComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteSubCategoryComplete', args);
	p.refresh = () => invokeOnce<any>('deleteSubCategoryComplete', args);
	return p;
};

export const getSubCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSubCategory', args);
	p.refresh = () => invokeOnce<any>('getSubCategory', args);
	return p;
};

export const getSubCategoryById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSubCategoryById', args);
	p.refresh = () => invokeOnce<any>('getSubCategoryById', args);
	return p;
};

export const getSubCategoryCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSubCategoryCount', args);
	p.refresh = () => invokeOnce<any>('getSubCategoryCount', args);
	return p;
};

export const getSubCategoryPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSubCategoryPaginated', args);
	p.refresh = () => invokeOnce<any>('getSubCategoryPaginated', args);
	return p;
};

export const updateSubCategory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateSubCategory', args);
	p.refresh = () => invokeOnce<any>('updateSubCategory', args);
	return p;
};

