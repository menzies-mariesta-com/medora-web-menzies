import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/religion.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const getReligion = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getReligion', args);
	p.refresh = () => invokeOnce<any>('getReligion', args);
	return p;
};

