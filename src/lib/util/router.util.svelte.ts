import { goto } from '$app/navigation';
import { page } from '$app/state';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { SvelteURL } from 'svelte/reactivity';

export class RouterUtil {
	constructor() { }

	/**
	 * Navigate to an internal route
	 * @param path Internal SvelteKit path
	 */
	goToRoute(path: string): void {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(path);
	}

	replaceRoute(path: string): void {
		goto(path, { replaceState: true })

	}

	/**
	 * Open an external page in a new tab
	 * @param path External or internal URL
	 */
	goToExternalPage(path: string): void {
		try {
			const url = new SvelteURL(path);
			window.open(url.href, '_blank', 'noopener,noreferrer');
		} catch (e) {
			console.error('Invalid external path:', e);
			const currentOrigin = window.location.origin;
			const fullUrl = path.startsWith('/')
				? `${currentOrigin}${path}`
				: `${currentOrigin}/${path}`;
			window.open(fullUrl, '_blank', 'noopener,noreferrer');
		}
	}

	/**
	 * Get the current full route (pathname only, no query or hash)
	 */
	getCurrentFullRoute(): string {
		return page.url.pathname;
	}

	/**
	 * Get current route segments as an array
	 */
	getCurrentRoutePathSegments(): string[] {
		const pathname = this.getCurrentFullRoute();
		return pathname
			.replace(/^\/|\/$/g, '')
			.split('/')
			.filter((segment) => segment !== '');
	}

	/**
	 * Navigate back in browser history
	 */
	goBackRoute(): void {
		window.history.back();
	}

	getResetRedirectUrl(): string {
		if (typeof window === 'undefined') return '';
		return `${window.location.origin}${WebRoutesEnum.RESET_PASSWORD}`;
	}
}
