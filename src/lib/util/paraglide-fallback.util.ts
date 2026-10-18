import { m } from '$lib/paraglide/messages';

/** Use when a key may be missing until `npm run paraglide` (avoids SSR 500). */
export function paraglideMsg(
	key: string,
	fallback: string,
	inputs?: object
): string {
	const fn = (m as Record<string, (i?: object) => string>)[key];
	return typeof fn === 'function' ? fn(inputs) : fallback;
}
