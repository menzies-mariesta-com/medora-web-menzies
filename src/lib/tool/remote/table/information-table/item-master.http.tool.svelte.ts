import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/item-master.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createItemMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createItemMaster', args);
	p.refresh = () => invokeOnce<any>('createItemMaster', args);
	return p;
};

export const deleteItemMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteItemMaster', args);
	p.refresh = () => invokeOnce<any>('deleteItemMaster', args);
	return p;
};

export const getItemMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getItemMaster', args);
	p.refresh = () => invokeOnce<any>('getItemMaster', args);
	return p;
};

export const getItemMasterById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getItemMasterById', args);
	p.refresh = () => invokeOnce<any>('getItemMasterById', args);
	return p;
};

export const getItemMasterByBarcode = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getItemMasterByBarcode', args);
	p.refresh = () => invokeOnce<any>('getItemMasterByBarcode', args);
	return p;
};

export const getItemMasterCategories = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getItemMasterCategories', args);
	p.refresh = () => invokeOnce<any>('getItemMasterCategories', args);
	return p;
};

export const getItemMasterPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getItemMasterPaginated', args);
	p.refresh = () => invokeOnce<any>('getItemMasterPaginated', args);
	return p;
};

export const getUnitsForItemMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUnitsForItemMaster', args);
	p.refresh = () => invokeOnce<any>('getUnitsForItemMaster', args);
	return p;
};

export const getUnitTypesForItemMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUnitTypesForItemMaster', args);
	p.refresh = () => invokeOnce<any>('getUnitTypesForItemMaster', args);
	return p;
};

export const getUnitById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getUnitById', args);
	p.refresh = () => invokeOnce<any>('getUnitById', args);
	return p;
};

export const updateItemMaster = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateItemMaster', args);
	p.refresh = () => invokeOnce<any>('updateItemMaster', args);
	return p;
};
