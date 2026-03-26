import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/service-order-detail.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createServiceOrderDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createServiceOrderDetail', args);
	p.refresh = () => invokeOnce<any>('createServiceOrderDetail', args);
	return p;
};

export const deleteServiceOrderDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceOrderDetail', args);
	p.refresh = () => invokeOnce<any>('deleteServiceOrderDetail', args);
	return p;
};

export const deleteServiceOrderDetailComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceOrderDetailComplete', args);
	p.refresh = () => invokeOnce<any>('deleteServiceOrderDetailComplete', args);
	return p;
};

export const getNursingIncompleteLineCountForVisit = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNursingIncompleteLineCountForVisit', args);
	p.refresh = () => invokeOnce<any>('getNursingIncompleteLineCountForVisit', args);
	return p;
};

export const getServiceOrderDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderDetail', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderDetail', args);
	return p;
};

export const getServiceOrderDetailById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderDetailById', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderDetailById', args);
	return p;
};

export const getServiceOrderDetailCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderDetailCount', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderDetailCount', args);
	return p;
};

export const getServiceOrderDetailPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderDetailPaginated', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderDetailPaginated', args);
	return p;
};

export const getServiceOrderDetailRowsForVisit = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderDetailRowsForVisit', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderDetailRowsForVisit', args);
	return p;
};

export const markServiceOrderDetailNursingComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('markServiceOrderDetailNursingComplete', args);
	p.refresh = () => invokeOnce<any>('markServiceOrderDetailNursingComplete', args);
	return p;
};

export const markServiceOrderDetailNursingCompleteBatch = (...args: any[]): any => {
	const p: any = invokeOnce<any>('markServiceOrderDetailNursingCompleteBatch', args);
	p.refresh = () => invokeOnce<any>('markServiceOrderDetailNursingCompleteBatch', args);
	return p;
};

export const updateServiceOrderDetail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateServiceOrderDetail', args);
	p.refresh = () => invokeOnce<any>('updateServiceOrderDetail', args);
	return p;
};

