import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/weekday.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createWeekday = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createWeekday', args);
	p.refresh = () => invokeOnce<any>('createWeekday', args);
	return p;
};

export const deleteWeekday = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteWeekday', args);
	p.refresh = () => invokeOnce<any>('deleteWeekday', args);
	return p;
};

export const deleteWeekdayComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteWeekdayComplete', args);
	p.refresh = () => invokeOnce<any>('deleteWeekdayComplete', args);
	return p;
};

export const getWeekday = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getWeekday', args);
	p.refresh = () => invokeOnce<any>('getWeekday', args);
	return p;
};

export const getWeekdayById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getWeekdayById', args);
	p.refresh = () => invokeOnce<any>('getWeekdayById', args);
	return p;
};

export const getWeekdayCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getWeekdayCount', args);
	p.refresh = () => invokeOnce<any>('getWeekdayCount', args);
	return p;
};

export const getWeekdayPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getWeekdayPaginated', args);
	p.refresh = () => invokeOnce<any>('getWeekdayPaginated', args);
	return p;
};

export const updateWeekday = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateWeekday', args);
	p.refresh = () => invokeOnce<any>('updateWeekday', args);
	return p;
};

