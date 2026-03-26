import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/notification/notification.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const getNotificationUnreadCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNotificationUnreadCount', args);
	p.refresh = () => invokeOnce<any>('getNotificationUnreadCount', args);
	return p;
};

export const getNotificationsLatest = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNotificationsLatest', args);
	p.refresh = () => invokeOnce<any>('getNotificationsLatest', args);
	return p;
};

export const getNotificationsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getNotificationsPaginated', args);
	p.refresh = () => invokeOnce<any>('getNotificationsPaginated', args);
	return p;
};

export const markAllNotificationsRead = (...args: any[]): any => {
	const p: any = invokeOnce<any>('markAllNotificationsRead', args);
	p.refresh = () => invokeOnce<any>('markAllNotificationsRead', args);
	return p;
};

export const markNotificationRead = (...args: any[]): any => {
	const p: any = invokeOnce<any>('markNotificationRead', args);
	p.refresh = () => invokeOnce<any>('markNotificationRead', args);
	return p;
};

