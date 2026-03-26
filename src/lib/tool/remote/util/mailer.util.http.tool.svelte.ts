import { remoteHttpClient } from '$lib/tool/remote/remote-http-client.tool.svelte';

const moduleSuffix = 'util/mailer.util.remote.ts';

function invokeOnce<T>(fn: string, args: unknown[]): Promise<T> {
	return remoteHttpClient.postRemoteInvoke<T>({
		module: moduleSuffix,
		fn,
		args
	});
}

export const sendEmail = (...args: any[]): any => {
	const p: any = invokeOnce<any>('sendEmail', args);
	p.refresh = () => invokeOnce<any>('sendEmail', args);
	return p;
};

