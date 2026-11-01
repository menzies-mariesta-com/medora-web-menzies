import { browser } from '$app/environment';

export const APP_BOOTSTRAP_LOADER_ID = 'medora-app-bootstrap-loader';

/** Hold spinner visible after app is ready, then fade out. */
export const APP_BOOTSTRAP_LOADER_EXIT_HOLD_MS = 500;

const WASH_VARS_ON_LOADER = [
	'--color-base-100',
	'--color-base-200',
	'--color-base-content',
	'--color-primary',
	'--color-primary-content',
	'--color-accent',
	'--pigment-grain',
	'--paper-fiber',
	'--brush-grain-opacity',
	'--grain-blend',
	'--radius-box',
	'--size-selector'
] as const;

let dismissScheduled = false;

/** Must stay aligned with routes that set `export const ssr = false`. */
export function pathnameUsesClientBootstrapLoader(pathname: string): boolean {
	const path = pathname.replace(/\/$/, '') || '/';
	if (path === '/auth' || path.startsWith('/auth/')) return true;
	if (path === '/medora' || path.startsWith('/medora/')) return true;
	if (path === '/onboarding' || path.startsWith('/onboarding/')) return true;
	return false;
}

/** True while SvelteKit is running a client navigation (SK 2.12+: use `.to`, not `.current`). */
export function isClientNavigationPending(nav: { to: unknown }): boolean {
	return nav.to != null;
}

/**
 * Copy active Wash theme tokens from `html` onto the loader overlay so it matches
 * the app once `WashThemeTool.boot()` has run (and early via static theme CSS).
 */
export function syncAppBootstrapLoaderWashTheme(): void {
	if (!browser) return;
	const el = document.getElementById(APP_BOOTSTRAP_LOADER_ID);
	if (!el) return;
	const rootStyle = getComputedStyle(document.documentElement);
	for (const prop of WASH_VARS_ON_LOADER) {
		el.style.setProperty(prop, rootStyle.getPropertyValue(prop));
	}
}

/** Removes the static loader injected from `app.html` (client-only routes). */
export function dismissAppBootstrapLoader(): void {
	if (!browser || dismissScheduled) return;
	const el = document.getElementById(APP_BOOTSTRAP_LOADER_ID);
	if (!el) return;

	dismissScheduled = true;
	window.setTimeout(() => {
		el.setAttribute('aria-busy', 'false');

		const reduceMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;
		if (reduceMotion) {
			el.remove();
			return;
		}

		el.classList.add('is-dismissed');
		const remove = () => el.remove();
		el.addEventListener('transitionend', remove, { once: true });
		window.setTimeout(remove, 500);
	}, APP_BOOTSTRAP_LOADER_EXIT_HOLD_MS);
}
