import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/allergy-master.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createAllergyMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createAllergyMaster', args);
	p.refresh = () => invokeOnce<any>('createAllergyMaster', args);
	return p;
};

export const deleteAllergyMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteAllergyMaster', args);
	p.refresh = () => invokeOnce<any>('deleteAllergyMaster', args);
	return p;
};

export const getAllergyMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergyMaster', args);
	p.refresh = () => invokeOnce<any>('getAllergyMaster', args);
	return p;
};

export const getAllergyMasterById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergyMasterById', args);
	p.refresh = () => invokeOnce<any>('getAllergyMasterById', args);
	return p;
};

export const getAllergyMasterCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergyMasterCount', args);
	p.refresh = () => invokeOnce<any>('getAllergyMasterCount', args);
	return p;
};

export const getAllergyMasterPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllergyMasterPaginated', args);
	p.refresh = () => invokeOnce<any>('getAllergyMasterPaginated', args);
	return p;
};

export const updateAllergyMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateAllergyMaster', args);
	p.refresh = () => invokeOnce<any>('updateAllergyMaster', args);
	return p;
};

