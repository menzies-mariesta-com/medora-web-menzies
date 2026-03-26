import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/staff-hospital.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createStaffHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createStaffHospital', args);
	p.refresh = () => invokeOnce<any>('createStaffHospital', args);
	return p;
};

export const deleteStaffHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffHospital', args);
	p.refresh = () => invokeOnce<any>('deleteStaffHospital', args);
	return p;
};

export const deleteStaffHospitalComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteStaffHospitalComplete', args);
	p.refresh = () => invokeOnce<any>('deleteStaffHospitalComplete', args);
	return p;
};

export const getStaffHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffHospital', args);
	p.refresh = () => invokeOnce<any>('getStaffHospital', args);
	return p;
};

export const getStaffHospitalById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffHospitalById', args);
	p.refresh = () => invokeOnce<any>('getStaffHospitalById', args);
	return p;
};

export const getStaffHospitalCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffHospitalCount', args);
	p.refresh = () => invokeOnce<any>('getStaffHospitalCount', args);
	return p;
};

export const getStaffHospitalPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffHospitalPaginated', args);
	p.refresh = () => invokeOnce<any>('getStaffHospitalPaginated', args);
	return p;
};

export const getStaffHospitalWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStaffHospitalWithRelations', args);
	p.refresh = () => invokeOnce<any>('getStaffHospitalWithRelations', args);
	return p;
};

export const updateStaffHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateStaffHospital', args);
	p.refresh = () => invokeOnce<any>('updateStaffHospital', args);
	return p;
};

