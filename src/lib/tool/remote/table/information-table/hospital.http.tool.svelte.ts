import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/hospital.remote.ts';

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

export const createHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createHospital', args);
	p.refresh = () => invokeOnce<any>('createHospital', args);
	return p;
};

export const deleteHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteHospital', args);
	p.refresh = () => invokeOnce<any>('deleteHospital', args);
	return p;
};

export const getHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospital', args);
	p.refresh = () => invokeOnce<any>('getHospital', args);
	return p;
};

export const getHospitalById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalById', args);
	p.refresh = () => invokeOnce<any>('getHospitalById', args);
	return p;
};

export const getHospitalWithOwner = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalWithOwner', args);
	p.refresh = () => invokeOnce<any>('getHospitalWithOwner', args);
	return p;
};

export const getHospitalWithOwnerPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalWithOwnerPaginated', args);
	p.refresh = () => invokeOnce<any>('getHospitalWithOwnerPaginated', args);
	return p;
};

export const getHospitalWithOwnerPaginatedWithFetch = (
	fetchFn: typeof fetch,
	...args: any[]
): any => {
	const p: any = invokeOnce<any>('getHospitalWithOwnerPaginated', args, fetchFn);
	p.refresh = () =>
		invokeOnce<any>('getHospitalWithOwnerPaginated', args, fetchFn);
	return p;
};

export const updateHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateHospital', args);
	p.refresh = () => invokeOnce<any>('updateHospital', args);
	return p;
};

