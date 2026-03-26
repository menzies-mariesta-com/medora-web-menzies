import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'third-party-api/marketplace/store.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const getStore = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getStore', args);
	p.refresh = () => invokeOnce<any>('getStore', args);
	return p;
};

