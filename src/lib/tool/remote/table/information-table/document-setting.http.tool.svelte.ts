import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/document-setting.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const createDocumentSetting = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createDocumentSetting', args);
	p.refresh = () => invokeOnce<any>('createDocumentSetting', args);
	return p;
};

export const deleteDocumentSetting = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deleteDocumentSetting', args);
	p.refresh = () => invokeOnce<any>('deleteDocumentSetting', args);
	return p;
};

export const getDocumentSettingById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentSettingById', args);
	p.refresh = () => invokeOnce<any>('getDocumentSettingById', args);
	return p;
};

export const getDocumentSettingCount = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentSettingCount', args);
	p.refresh = () => invokeOnce<any>('getDocumentSettingCount', args);
	return p;
};

export const getDocumentSettings = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentSettings', args);
	p.refresh = () => invokeOnce<any>('getDocumentSettings', args);
	return p;
};

export const getDocumentSettingsPaginated = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentSettingsPaginated', args);
	p.refresh = () => invokeOnce<any>('getDocumentSettingsPaginated', args);
	return p;
};

export const getDocumentSettingsWithRelations = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getDocumentSettingsWithRelations', args);
	p.refresh = () => invokeOnce<any>('getDocumentSettingsWithRelations', args);
	return p;
};

export const updateDocumentSetting = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updateDocumentSetting', args);
	p.refresh = () => invokeOnce<any>('updateDocumentSetting', args);
	return p;
};

