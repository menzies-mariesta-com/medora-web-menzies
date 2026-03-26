import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'table/information-table/visit-type.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postJson<T>('/api/remote/invoke', {
		module: moduleSuffix,
		fn,
		args
	});
}

export const getVisitType = (...args: any[]): any => {
	const p: any = invokeOnce<any>('getVisitType', args);
	p.refresh = () => invokeOnce<any>('getVisitType', args);
	return p;
};

