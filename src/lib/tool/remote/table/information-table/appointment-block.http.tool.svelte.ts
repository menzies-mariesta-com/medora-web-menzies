import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/appointment-block.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createAppointmentBlock = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createAppointmentBlock', args);
	p.refresh = () => invokeOnce<any>('createAppointmentBlock', args);
	return p;
};

export const deleteAppointmentBlock = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteAppointmentBlock', args);
	p.refresh = () => invokeOnce<any>('deleteAppointmentBlock', args);
	return p;
};

export const getAppointmentBlock = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAppointmentBlock', args);
	p.refresh = () => invokeOnce<any>('getAppointmentBlock', args);
	return p;
};

export const updateAppointmentBlock = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateAppointmentBlock', args);
	p.refresh = () => invokeOnce<any>('updateAppointmentBlock', args);
	return p;
};

