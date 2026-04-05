import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/appointment.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createAppointment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createAppointment', args);
	p.refresh = () => invokeOnce<any>('createAppointment', args);
	return p;
};

export const deleteAppointment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteAppointment', args);
	p.refresh = () => invokeOnce<any>('deleteAppointment', args);
	return p;
};

export const deleteAppointmentComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteAppointmentComplete', args);
	p.refresh = () => invokeOnce<any>('deleteAppointmentComplete', args);
	return p;
};

export const getAppointment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointment', args);
	p.refresh = () => invokeOnce<any>('getAppointment', args);
	return p;
};

export const getAppointmentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointmentById', args);
	p.refresh = () => invokeOnce<any>('getAppointmentById', args);
	return p;
};

export const getAppointmentCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointmentCount', args);
	p.refresh = () => invokeOnce<any>('getAppointmentCount', args);
	return p;
};

export const getAppointmentPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointmentPaginated', args);
	p.refresh = () => invokeOnce<any>('getAppointmentPaginated', args);
	return p;
};

export const getAppointmentWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointmentWithRelations', args);
	p.refresh = () => invokeOnce<any>('getAppointmentWithRelations', args);
	return p;
};

/**
 * Single POST to `getAppointmentWithRelations` (same payload as `.refresh()` on the handle).
 * Use after create/update/cancel/delete so the calendar always reads fresh rows from the DB.
 */
export function refetchAppointmentWithRelations(
	...args: unknown[]
): Promise<unknown> {
	return invokeOnce('getAppointmentWithRelations', args);
}

export const updateAppointment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateAppointment', args);
	p.refresh = () => invokeOnce<any>('updateAppointment', args);
	return p;
};

export const getAppointmentCancelEligibility = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointmentCancelEligibility', args);
	p.refresh = () => invokeOnce<any>('getAppointmentCancelEligibility', args);
	return p;
};

