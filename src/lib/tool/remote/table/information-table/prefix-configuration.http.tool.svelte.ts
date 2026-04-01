import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/prefix-configuration.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const getPrefixConfigurationByHospital = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPrefixConfigurationByHospital', args);
	p.refresh = () => invokeOnce<any>('getPrefixConfigurationByHospital', args);
	return p;
};

export const getPrefixConfigurationById = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getPrefixConfigurationById', args);
	p.refresh = () => invokeOnce<any>('getPrefixConfigurationById', args);
	return p;
};

export const createPrefixConfiguration = (...args: any[]): any => {
	const p: any = invokeOnce<any>('createPrefixConfiguration', args);
	p.refresh = () => invokeOnce<any>('createPrefixConfiguration', args);
	return p;
};

export const updatePrefixConfiguration = (...args: any[]): any => {
	const p: any = invokeOnce<any>('updatePrefixConfiguration', args);
	p.refresh = () => invokeOnce<any>('updatePrefixConfiguration', args);
	return p;
};

export const deletePrefixConfiguration = (...args: any[]): any => {
	const p: any = invokeOnce<any>('deletePrefixConfiguration', args);
	p.refresh = () => invokeOnce<any>('deletePrefixConfiguration', args);
	return p;
};

