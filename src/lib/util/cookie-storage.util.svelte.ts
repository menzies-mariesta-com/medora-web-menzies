import { browser } from '$app/environment';
import { SvelteDate } from 'svelte/reactivity';

export class CookieStorageUtil {
	constructor() {}

	setItem<T>(key: string, value: T, days = 7): void {
		if (!browser) return;
		try {
			const stringValue =
				typeof value === 'string' ? value : JSON.stringify(value);

			const date = new SvelteDate();
			date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
			const expires = `; expires=${date.toUTCString()}`;

			document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(
				stringValue
			)}${expires}; path=/`;
		} catch (error) {
			console.error(`Error saving cookie "${key}":`, error);
		}
	}

	getItem<T>(key: string): T | null {
		if (!browser) return null; // SSR returns null
		try {
			const nameEQ = encodeURIComponent(key) + '=';
			const cookies = document.cookie.split(';');

			for (let c of cookies) {
				c = c.trim();
				if (c.startsWith(nameEQ)) {
					const raw = decodeURIComponent(c.substring(nameEQ.length));
					try {
						return JSON.parse(raw) as T;
					} catch {
						return raw as unknown as T;
					}
				}
			}
			return null;
		} catch (error) {
			console.error(`Error reading cookie "${key}":`, error);
			return null;
		}
	}

	removeItem(key: string): void {
		if (!browser) return; // SSR no-op
		try {
			document.cookie = `${encodeURIComponent(
				key
			)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
		} catch (error) {
			console.error(`Error removing cookie "${key}":`, error);
		}
	}

	clear(): void {
		if (!browser) return; // SSR no-op
		try {
			const cookies = document.cookie.split(';');
			for (const cookie of cookies) {
				const eqPos = cookie.indexOf('=');
				const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
			}
		} catch (error) {
			console.error('Error clearing cookies:', error);
		}
	}

	hasItem(key: string): boolean {
		if (!browser) return false; // SSR false
		return this.getItem(key) !== null;
	}
}
