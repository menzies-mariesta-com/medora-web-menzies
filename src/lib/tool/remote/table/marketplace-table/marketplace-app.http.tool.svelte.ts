import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/marketplace-table/marketplace-app.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createMarketplaceApp = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createMarketplaceApp', args);
	p.refresh = () => invokeOnce<any>('createMarketplaceApp', args);
	return p;
};

export const deleteMarketplaceApp = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteMarketplaceApp', args);
	p.refresh = () => invokeOnce<any>('deleteMarketplaceApp', args);
	return p;
};

export const getMarketplaceAppById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppById', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppById', args);
	return p;
};

export const getMarketplaceAppCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppCount', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppCount', args);
	return p;
};

export const getMarketplaceApps = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceApps', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceApps', args);
	return p;
};

export const getMarketplaceAppsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppsPaginated', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppsPaginated', args);
	return p;
};

export const getMarketplaceAppsWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppsWithRelations', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppsWithRelations', args);
	return p;
};

export const updateMarketplaceApp = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateMarketplaceApp', args);
	p.refresh = () => invokeOnce<any>('updateMarketplaceApp', args);
	return p;
};

