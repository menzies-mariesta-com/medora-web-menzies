import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-attachment.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientAttachment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientAttachment', args);
	p.refresh = () => invokeOnce<any>('createPatientAttachment', args);
	return p;
};

export const deletePatientAttachment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientAttachment', args);
	p.refresh = () => invokeOnce<any>('deletePatientAttachment', args);
	return p;
};

export const deletePatientAttachmentComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientAttachmentComplete', args);
	p.refresh = () => invokeOnce<any>('deletePatientAttachmentComplete', args);
	return p;
};

export const getPatientAttachment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAttachment', args);
	p.refresh = () => invokeOnce<any>('getPatientAttachment', args);
	return p;
};

export const getPatientAttachmentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAttachmentById', args);
	p.refresh = () => invokeOnce<any>('getPatientAttachmentById', args);
	return p;
};

export const getPatientAttachmentByPatientId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAttachmentByPatientId', args);
	p.refresh = () => invokeOnce<any>('getPatientAttachmentByPatientId', args);
	return p;
};

export const getPatientAttachmentCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAttachmentCount', args);
	p.refresh = () => invokeOnce<any>('getPatientAttachmentCount', args);
	return p;
};

export const getPatientAttachmentPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAttachmentPaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientAttachmentPaginated', args);
	return p;
};

export const getPatientAttachmentWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientAttachmentWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientAttachmentWithRelations', args);
	return p;
};

export const updatePatientAttachment = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientAttachment', args);
	p.refresh = () => invokeOnce<any>('updatePatientAttachment', args);
	return p;
};

