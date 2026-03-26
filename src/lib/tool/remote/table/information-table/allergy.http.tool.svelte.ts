import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/allergy.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createAllergy = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createAllergy', args);
	p.refresh = () => invokeOnce<any>('createAllergy', args);
	return p;
};

export const getAllergies = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergies', args);
	p.refresh = () => invokeOnce<any>('getAllergies', args);
	return p;
};

export const getAllergyById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergyById', args);
	p.refresh = () => invokeOnce<any>('getAllergyById', args);
	return p;
};

export const getAllergyPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergyPaginated', args);
	p.refresh = () => invokeOnce<any>('getAllergyPaginated', args);
	return p;
};

export const updateAllergy = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateAllergy', args);
	p.refresh = () => invokeOnce<any>('updateAllergy', args);
	return p;
};

