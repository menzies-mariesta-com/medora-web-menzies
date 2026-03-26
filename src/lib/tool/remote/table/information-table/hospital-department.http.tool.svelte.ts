import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/hospital-department.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createHospitalDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createHospitalDepartment', args);
	p.refresh = () => invokeOnce<any>('createHospitalDepartment', args);
	return p;
};

export const deleteHospitalDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteHospitalDepartment', args);
	p.refresh = () => invokeOnce<any>('deleteHospitalDepartment', args);
	return p;
};

export const getHospitalDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalDepartment', args);
	p.refresh = () => invokeOnce<any>('getHospitalDepartment', args);
	return p;
};

export const getHospitalDepartmentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalDepartmentById', args);
	p.refresh = () => invokeOnce<any>('getHospitalDepartmentById', args);
	return p;
};

export const getHospitalDepartmentByIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalDepartmentByIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getHospitalDepartmentByIdWithRelations', args);
	return p;
};

export const getHospitalDepartmentCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalDepartmentCount', args);
	p.refresh = () => invokeOnce<any>('getHospitalDepartmentCount', args);
	return p;
};

export const getHospitalDepartmentPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalDepartmentPaginated', args);
	p.refresh = () => invokeOnce<any>('getHospitalDepartmentPaginated', args);
	return p;
};

export const getHospitalDepartmentWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getHospitalDepartmentWithRelations', args);
	p.refresh = () => invokeOnce<any>('getHospitalDepartmentWithRelations', args);
	return p;
};

export const updateHospitalDepartment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateHospitalDepartment', args);
	p.refresh = () => invokeOnce<any>('updateHospitalDepartment', args);
	return p;
};

