import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/staff-shift-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffShiftType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffShiftType', args);
	p.refresh = () => invokeOnce<any>('createStaffShiftType', args);
	return p;
};

export const deleteStaffShiftType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffShiftType', args);
	p.refresh = () => invokeOnce<any>('deleteStaffShiftType', args);
	return p;
};

export const deleteStaffShiftTypeComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffShiftTypeComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffShiftTypeComplete', args);
	return p;
};

export const getStaffShiftType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffShiftType', args);
	p.refresh = () => invokeOnce<any>('getStaffShiftType', args);
	return p;
};

export const getStaffShiftTypeById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffShiftTypeById', args);
	p.refresh = () => invokeOnce<any>('getStaffShiftTypeById', args);
	return p;
};

export const getStaffShiftTypeCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffShiftTypeCount', args);
	p.refresh = () => invokeOnce<any>('getStaffShiftTypeCount', args);
	return p;
};

export const getStaffShiftTypePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffShiftTypePaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffShiftTypePaginated', args);
	return p;
};

export const updateStaffShiftType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffShiftType', args);
	p.refresh = () => invokeOnce<any>('updateStaffShiftType', args);
	return p;
};

