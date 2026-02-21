import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute = (request: { url: string | URL }) =>
	(typeof request.url === 'string' ? deLocalizeUrl(request.url) : deLocalizeUrl(request.url)).pathname;
