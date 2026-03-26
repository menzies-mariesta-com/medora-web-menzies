import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/support-ticket.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createSupportTicket = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createSupportTicket', args);
	p.refresh = () => invokeOnce<any>('createSupportTicket', args);
	return p;
};

export const getAllSupportTicketsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getAllSupportTicketsPaginated', args);
	p.refresh = () => invokeOnce<any>('getAllSupportTicketsPaginated', args);
	return p;
};

export const getMySupportTicketsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMySupportTicketsPaginated', args);
	p.refresh = () => invokeOnce<any>('getMySupportTicketsPaginated', args);
	return p;
};

export const getSupportTicketById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSupportTicketById', args);
	p.refresh = () => invokeOnce<any>('getSupportTicketById', args);
	return p;
};

export const getSupportTicketSession = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSupportTicketSession', args);
	p.refresh = () => invokeOnce<any>('getSupportTicketSession', args);
	return p;
};

export const updateSupportTicket = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateSupportTicket', args);
	p.refresh = () => invokeOnce<any>('updateSupportTicket', args);
	return p;
};

