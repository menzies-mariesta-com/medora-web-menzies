import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/doctor-schedule.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createDoctorSchedule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createDoctorSchedule', args);
	p.refresh = () => invokeOnce<any>('createDoctorSchedule', args);
	return p;
};

export const deleteDoctorSchedule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDoctorSchedule', args);
	p.refresh = () => invokeOnce<any>('deleteDoctorSchedule', args);
	return p;
};

export const deleteDoctorScheduleComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDoctorScheduleComplete', args);
	p.refresh = () => invokeOnce<any>('deleteDoctorScheduleComplete', args);
	return p;
};

export const getDoctorSchedule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorSchedule', args);
	p.refresh = () => invokeOnce<any>('getDoctorSchedule', args);
	return p;
};

export const getDoctorScheduleById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorScheduleById', args);
	p.refresh = () => invokeOnce<any>('getDoctorScheduleById', args);
	return p;
};

export const getDoctorScheduleCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorScheduleCount', args);
	p.refresh = () => invokeOnce<any>('getDoctorScheduleCount', args);
	return p;
};

export const getDoctorSchedulePaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorSchedulePaginated', args);
	p.refresh = () => invokeOnce<any>('getDoctorSchedulePaginated', args);
	return p;
};

export const getDoctorScheduleWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDoctorScheduleWithRelations', args);
	p.refresh = () => invokeOnce<any>('getDoctorScheduleWithRelations', args);
	return p;
};

export const updateDoctorSchedule = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateDoctorSchedule', args);
	p.refresh = () => invokeOnce<any>('updateDoctorSchedule', args);
	return p;
};

