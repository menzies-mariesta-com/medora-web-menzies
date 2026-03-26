import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/marketplace-table/marketplace-app-archive.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createMarketplaceAppArchive = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createMarketplaceAppArchive', args);
	p.refresh = () => invokeOnce<any>('createMarketplaceAppArchive', args);
	return p;
};

export const deleteMarketplaceAppArchive = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteMarketplaceAppArchive', args);
	p.refresh = () => invokeOnce<any>('deleteMarketplaceAppArchive', args);
	return p;
};

export const getMarketplaceAppArchiveById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppArchiveById', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppArchiveById', args);
	return p;
};

export const getMarketplaceAppArchiveCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppArchiveCount', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppArchiveCount', args);
	return p;
};

export const getMarketplaceAppArchives = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppArchives', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppArchives', args);
	return p;
};

export const getMarketplaceAppArchivesPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppArchivesPaginated', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppArchivesPaginated', args);
	return p;
};

export const getMarketplaceAppArchivesWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppArchivesWithRelations', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppArchivesWithRelations', args);
	return p;
};

export const updateMarketplaceAppArchive = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateMarketplaceAppArchive', args);
	p.refresh = () => invokeOnce<any>('updateMarketplaceAppArchive', args);
	return p;
};

