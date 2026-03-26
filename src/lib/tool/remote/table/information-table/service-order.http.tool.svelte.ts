import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/service-order.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createServiceOrder = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createServiceOrder', args);
	p.refresh = () => invokeOnce<any>('createServiceOrder', args);
	return p;
};

export const deleteServiceOrder = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceOrder', args);
	p.refresh = () => invokeOnce<any>('deleteServiceOrder', args);
	return p;
};

export const deleteServiceOrderComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceOrderComplete', args);
	p.refresh = () => invokeOnce<any>('deleteServiceOrderComplete', args);
	return p;
};

export const getServiceOrder = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrder', args);
	p.refresh = () => invokeOnce<any>('getServiceOrder', args);
	return p;
};

export const getServiceOrderById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderById', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderById', args);
	return p;
};

export const getServiceOrderCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderCount', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderCount', args);
	return p;
};

export const getServiceOrderPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceOrderPaginated', args);
	p.refresh = () => invokeOnce<any>('getServiceOrderPaginated', args);
	return p;
};

export const updateServiceOrder = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateServiceOrder', args);
	p.refresh = () => invokeOnce<any>('updateServiceOrder', args);
	return p;
};

