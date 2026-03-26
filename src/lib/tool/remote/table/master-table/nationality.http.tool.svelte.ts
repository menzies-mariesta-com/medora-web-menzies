import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/nationality.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createNationality = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createNationality', args);
	p.refresh = () => invokeOnce<any>('createNationality', args);
	return p;
};

export const deleteNationality = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteNationality', args);
	p.refresh = () => invokeOnce<any>('deleteNationality', args);
	return p;
};

export const deleteNationalityComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteNationalityComplete', args);
	p.refresh = () => invokeOnce<any>('deleteNationalityComplete', args);
	return p;
};

export const getNationality = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNationality', args);
	p.refresh = () => invokeOnce<any>('getNationality', args);
	return p;
};

export const getNationalityById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNationalityById', args);
	p.refresh = () => invokeOnce<any>('getNationalityById', args);
	return p;
};

export const getNationalityCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNationalityCount', args);
	p.refresh = () => invokeOnce<any>('getNationalityCount', args);
	return p;
};

export const getNationalityPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNationalityPaginated', args);
	p.refresh = () => invokeOnce<any>('getNationalityPaginated', args);
	return p;
};

export const updateNationality = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateNationality', args);
	p.refresh = () => invokeOnce<any>('updateNationality', args);
	return p;
};

