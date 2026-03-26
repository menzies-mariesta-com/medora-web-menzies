import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/gender.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createGender = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createGender', args);
	p.refresh = () => invokeOnce<any>('createGender', args);
	return p;
};

export const deleteGender = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteGender', args);
	p.refresh = () => invokeOnce<any>('deleteGender', args);
	return p;
};

export const deleteGenderComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteGenderComplete', args);
	p.refresh = () => invokeOnce<any>('deleteGenderComplete', args);
	return p;
};

export const getGender = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getGender', args);
	p.refresh = () => invokeOnce<any>('getGender', args);
	return p;
};

export const getGenderById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getGenderById', args);
	p.refresh = () => invokeOnce<any>('getGenderById', args);
	return p;
};

export const getGenderCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getGenderCount', args);
	p.refresh = () => invokeOnce<any>('getGenderCount', args);
	return p;
};

export const getGenderPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getGenderPaginated', args);
	p.refresh = () => invokeOnce<any>('getGenderPaginated', args);
	return p;
};

export const updateGender = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateGender', args);
	p.refresh = () => invokeOnce<any>('updateGender', args);
	return p;
};

