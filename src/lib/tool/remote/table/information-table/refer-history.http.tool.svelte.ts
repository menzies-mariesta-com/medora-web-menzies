import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/refer-history.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const acceptReferHistory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('acceptReferHistory', args);
	p.refresh = () => invokeOnce<any>('acceptReferHistory', args);
	return p;
};

export const cancelReferHistory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('cancelReferHistory', args);
	p.refresh = () => invokeOnce<any>('cancelReferHistory', args);
	return p;
};

export const createReferHistory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createReferHistory', args);
	p.refresh = () => invokeOnce<any>('createReferHistory', args);
	return p;
};

export const getReferHistory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferHistory', args);
	p.refresh = () => invokeOnce<any>('getReferHistory', args);
	return p;
};

export const getReferHistoryById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferHistoryById', args);
	p.refresh = () => invokeOnce<any>('getReferHistoryById', args);
	return p;
};

export const getReferHistoryPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferHistoryPaginated', args);
	p.refresh = () => invokeOnce<any>('getReferHistoryPaginated', args);
	return p;
};

export const getReferHistoryWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReferHistoryWithRelations', args);
	p.refresh = () => invokeOnce<any>('getReferHistoryWithRelations', args);
	return p;
};

export const rejectReferHistory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('rejectReferHistory', args);
	p.refresh = () => invokeOnce<any>('rejectReferHistory', args);
	return p;
};

export const updateReferHistory = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateReferHistory', args);
	p.refresh = () => invokeOnce<any>('updateReferHistory', args);
	return p;
};

