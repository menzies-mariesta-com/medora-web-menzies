import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/staff-branch.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffBranch', args);
	p.refresh = () => invokeOnce<any>('createStaffBranch', args);
	return p;
};

export const deleteStaffBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffBranch', args);
	p.refresh = () => invokeOnce<any>('deleteStaffBranch', args);
	return p;
};

export const getStaffBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffBranch', args);
	p.refresh = () => invokeOnce<any>('getStaffBranch', args);
	return p;
};

export const getStaffBranchByStaffAndHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffBranchByStaffAndHospital', args);
	p.refresh = () => invokeOnce<any>('getStaffBranchByStaffAndHospital', args);
	return p;
};

export const getStaffBranchCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffBranchCount', args);
	p.refresh = () => invokeOnce<any>('getStaffBranchCount', args);
	return p;
};

export const getStaffBranchPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffBranchPaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffBranchPaginated', args);
	return p;
};

export const updateStaffBranch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffBranch', args);
	p.refresh = () => invokeOnce<any>('updateStaffBranch', args);
	return p;
};

