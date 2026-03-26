import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/craft-group.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createCraftGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createCraftGroup', args);
	p.refresh = () => invokeOnce<any>('createCraftGroup', args);
	return p;
};

export const deleteCraftGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCraftGroup', args);
	p.refresh = () => invokeOnce<any>('deleteCraftGroup', args);
	return p;
};

export const deleteCraftGroupComplete = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteCraftGroupComplete', args);
	p.refresh = () => invokeOnce<any>('deleteCraftGroupComplete', args);
	return p;
};

export const getCraftGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCraftGroup', args);
	p.refresh = () => invokeOnce<any>('getCraftGroup', args);
	return p;
};

export const getCraftGroupById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCraftGroupById', args);
	p.refresh = () => invokeOnce<any>('getCraftGroupById', args);
	return p;
};

export const getCraftGroupCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCraftGroupCount', args);
	p.refresh = () => invokeOnce<any>('getCraftGroupCount', args);
	return p;
};

export const getCraftGroupPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getCraftGroupPaginated', args);
	p.refresh = () => invokeOnce<any>('getCraftGroupPaginated', args);
	return p;
};

export const updateCraftGroup = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateCraftGroup', args);
	p.refresh = () => invokeOnce<any>('updateCraftGroup', args);
	return p;
};

