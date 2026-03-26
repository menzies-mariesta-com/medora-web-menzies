import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/master-table/severity.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const getSeverities = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getSeverities', args);
	p.refresh = () => invokeOnce<any>('getSeverities', args);
	return p;
};

