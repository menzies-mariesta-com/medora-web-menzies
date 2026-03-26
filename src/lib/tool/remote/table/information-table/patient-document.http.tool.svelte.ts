import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/patient-document.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPatientDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPatientDocument', args);
	p.refresh = () => invokeOnce<any>('createPatientDocument', args);
	return p;
};

export const deletePatientDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePatientDocument', args);
	p.refresh = () => invokeOnce<any>('deletePatientDocument', args);
	return p;
};

export const getPatientDocumentById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentById', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentById', args);
	return p;
};

export const getPatientDocuments = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocuments', args);
	p.refresh = () => invokeOnce<any>('getPatientDocuments', args);
	return p;
};

export const getPatientDocumentsByPatientId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentsByPatientId', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentsByPatientId', args);
	return p;
};

export const getPatientDocumentsByPatientIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentsByPatientIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentsByPatientIdWithRelations', args);
	return p;
};

export const getPatientDocumentsByVisitId = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentsByVisitId', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentsByVisitId', args);
	return p;
};

export const getPatientDocumentsByVisitIdWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentsByVisitIdWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentsByVisitIdWithRelations', args);
	return p;
};

export const getPatientDocumentsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentsPaginated', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentsPaginated', args);
	return p;
};

export const getPatientDocumentsWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPatientDocumentsWithRelations', args);
	p.refresh = () => invokeOnce<any>('getPatientDocumentsWithRelations', args);
	return p;
};

export const inactivatePatientDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('inactivatePatientDocument', args);
	p.refresh = () => invokeOnce<any>('inactivatePatientDocument', args);
	return p;
};

export const updatePatientDocument = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePatientDocument', args);
	p.refresh = () => invokeOnce<any>('updatePatientDocument', args);
	return p;
};

