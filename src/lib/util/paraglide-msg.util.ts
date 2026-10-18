import * as paraglide from '$lib/paraglide/messages';

type MsgFn = (inputs?: object) => string;

/**
 * Paraglide message bag via named barrel exports (`export *`), not `export * as m`.
 *
 * Vite SSR can keep a stale `m` namespace after mid-session `npm run paraglide`
 * (new keys missing until restart). Named re-exports update with `_index.js`.
 */
export function paraglideMessages(): Record<string, MsgFn> {
	return paraglide as unknown as Record<string, MsgFn>;
}

/** Call a message key; return fallback when the export is briefly missing. */
export function paraglideMsg(
	key: string,
	fallback: string,
	inputs?: object
): string {
	const bag = paraglide as unknown as Record<string, MsgFn | undefined>;
	const fn = bag[key];
	if (typeof fn === 'function') return fn(inputs);
	const viaM = (paraglide as { m?: Record<string, MsgFn | undefined> }).m?.[
		key
	];
	if (typeof viaM === 'function') return viaM(inputs);
	return fallback;
}
