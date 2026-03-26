import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/hospital-branch.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createBranch', args);
	p.refresh = () => invokeOnce<any>('createBranch', args);
	return p;
};

export const deleteBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteBranch', args);
	p.refresh = () => invokeOnce<any>('deleteBranch', args);
	return p;
};

export const getBranchById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBranchById', args);
	p.refresh = () => invokeOnce<any>('getBranchById', args);
	return p;
};

export const getBranchesByHospitalId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBranchesByHospitalId', args);
	p.refresh = () => invokeOnce<any>('getBranchesByHospitalId', args);
	return p;
};

export const getBranchesByHospitalIdPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getBranchesByHospitalIdPaginated', args);
	p.refresh = () => invokeOnce<any>('getBranchesByHospitalIdPaginated', args);
	return p;
};

export const updateBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateBranch', args);
	p.refresh = () => invokeOnce<any>('updateBranch', args);
	return p;
};

