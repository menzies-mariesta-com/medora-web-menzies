import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/position.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createPosition = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPosition', args);
	p.refresh = () => invokeOnce<any>('createPosition', args);
	return p;
};

export const deletePosition = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePosition', args);
	p.refresh = () => invokeOnce<any>('deletePosition', args);
	return p;
};

export const deletePositionComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePositionComplete', args);
	p.refresh = () => invokeOnce<any>('deletePositionComplete', args);
	return p;
};

export const getPosition = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPosition', args);
	p.refresh = () => invokeOnce<any>('getPosition', args);
	return p;
};

export const getPositionById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPositionById', args);
	p.refresh = () => invokeOnce<any>('getPositionById', args);
	return p;
};

export const getPositionCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPositionCount', args);
	p.refresh = () => invokeOnce<any>('getPositionCount', args);
	return p;
};

export const getPositionPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPositionPaginated', args);
	p.refresh = () => invokeOnce<any>('getPositionPaginated', args);
	return p;
};

export const updatePosition = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePosition', args);
	p.refresh = () => invokeOnce<any>('updatePosition', args);
	return p;
};

