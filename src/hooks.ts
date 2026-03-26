import * as paraglideRuntime from '$lib/paraglide/runtime';

function deLocalizePathname(input: string | URL): string {
	const anyRuntime = paraglideRuntime as unknown as {
		deLocalizeUrl?: (url: string | URL) => URL;
		locales?: readonly string[];
		baseLocale?: string;
	};
	if (typeof anyRuntime.deLocalizeUrl === 'function') {
		return anyRuntime.deLocalizeUrl(input).pathname;
	}

	const url =
		typeof input === 'string'
			? new URL(input, 'http://localhost')
			: input;
	const parts = url.pathname.split('/').filter(Boolean);
	const localeSet = new Set(anyRuntime.locales ?? []);
	if (parts.length > 0 && localeSet.has(parts[0])) {
		parts.shift();
	}
	const fallbackPath = `/${parts.join('/')}`;
	return fallbackPath === '/'
		? '/'
		: fallbackPath.replace(/\/+$/, '');
}

export const reroute = (request: { url: string | URL }) =>
	deLocalizePathname(request.url);
