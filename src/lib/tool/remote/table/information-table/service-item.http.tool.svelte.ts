import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/service-item.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createServiceItem = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createServiceItem', args);
	p.refresh = () => invokeOnce<any>('createServiceItem', args);
	return p;
};

export const deleteServiceItem = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceItem', args);
	p.refresh = () => invokeOnce<any>('deleteServiceItem', args);
	return p;
};

export const deleteServiceItemComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteServiceItemComplete', args);
	p.refresh = () => invokeOnce<any>('deleteServiceItemComplete', args);
	return p;
};

export const getServiceItem = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceItem', args);
	p.refresh = () => invokeOnce<any>('getServiceItem', args);
	return p;
};

export const getServiceItemById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceItemById', args);
	p.refresh = () => invokeOnce<any>('getServiceItemById', args);
	return p;
};

export const getServiceItemCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceItemCount', args);
	p.refresh = () => invokeOnce<any>('getServiceItemCount', args);
	return p;
};

export const getServiceItemPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getServiceItemPaginated', args);
	p.refresh = () => invokeOnce<any>('getServiceItemPaginated', args);
	return p;
};

export const updateServiceItem = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateServiceItem', args);
	p.refresh = () => invokeOnce<any>('updateServiceItem', args);
	return p;
};

