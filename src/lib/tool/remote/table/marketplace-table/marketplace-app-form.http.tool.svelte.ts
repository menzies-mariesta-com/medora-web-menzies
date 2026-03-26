import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/marketplace-table/marketplace-app-form.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createMarketplaceAppForm = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createMarketplaceAppForm', args);
	p.refresh = () => invokeOnce<any>('createMarketplaceAppForm', args);
	return p;
};

export const deleteMarketplaceAppForm = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteMarketplaceAppForm', args);
	p.refresh = () => invokeOnce<any>('deleteMarketplaceAppForm', args);
	return p;
};

export const getMarketplaceAppFormById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppFormById', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppFormById', args);
	return p;
};

export const getMarketplaceAppFormCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppFormCount', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppFormCount', args);
	return p;
};

export const getMarketplaceAppForms = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppForms', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppForms', args);
	return p;
};

export const getMarketplaceAppFormsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppFormsPaginated', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppFormsPaginated', args);
	return p;
};

export const getMarketplaceAppFormsWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getMarketplaceAppFormsWithRelations', args);
	p.refresh = () => invokeOnce<any>('getMarketplaceAppFormsWithRelations', args);
	return p;
};

export const updateMarketplaceAppForm = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateMarketplaceAppForm', args);
	p.refresh = () => invokeOnce<any>('updateMarketplaceAppForm', args);
	return p;
};

