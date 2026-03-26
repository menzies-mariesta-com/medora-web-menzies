import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/marketplace-table/marketplace-allowed-file-extension.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const createMarketplaceAllowedFileExtension = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createMarketplaceAllowedFileExtension', args);
	p.refresh = () => invokeOnce<any>('createMarketplaceAllowedFileExtension', args);
	return p;
};

export const deleteMarketplaceAllowedFileExtension = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteMarketplaceAllowedFileExtension', args);
	p.refresh = () => invokeOnce<any>('deleteMarketplaceAllowedFileExtension', args);
	return p;
};

export const getMarketplaceAllowedFileExtensionById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAllowedFileExtensionById', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAllowedFileExtensionById', args);
	return p;
};

export const getMarketplaceAllowedFileExtensionCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAllowedFileExtensionCount', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAllowedFileExtensionCount', args);
	return p;
};

export const getMarketplaceAllowedFileExtensions = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAllowedFileExtensions', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAllowedFileExtensions', args);
	return p;
};

export const getMarketplaceAllowedFileExtensionsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAllowedFileExtensionsPaginated', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAllowedFileExtensionsPaginated', args);
	return p;
};

export const getMarketplaceAllowedFileExtensionsWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAllowedFileExtensionsWithRelations', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAllowedFileExtensionsWithRelations', args);
	return p;
};

export const updateMarketplaceAllowedFileExtension = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateMarketplaceAllowedFileExtension', args);
	p.refresh = () => invokeOnce<any>('updateMarketplaceAllowedFileExtension', args);
	return p;
};

