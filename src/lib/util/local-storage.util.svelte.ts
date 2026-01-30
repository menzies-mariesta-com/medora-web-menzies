import { browser } from '$app/environment';

export class LocalStorageUtil {
	constructor() {}

	/**
	 * Save data to localStorageUtil
	 */
	setItem<T>(key: string, value: T): void {
		if (!browser) return; // SSR no-op
		try {
			const stringValue =
				typeof value === 'string' ? value : JSON.stringify(value);
			localStorage.setItem(key, stringValue);
		} catch (error) {
			console.error(
				`Error saving to localStorageUtil with key "${key}":`,
				error
			);
		}
	}

	/**
	 * Retrieve data from localStorageUtil
	 */
	getItem<T>(key: string): T | null {
		if (!browser) return null; // SSR returns null
		try {
			const item = localStorage.getItem(key);
			if (!item) return null;

			try {
				return JSON.parse(item) as T;
			} catch {
				return item as unknown as T;
			}
		} catch (error) {
			console.error(
				`Error reading from localStorageUtil with key "${key}":`,
				error
			);
			return null;
		}
	}

	/**
	 * Remove an item from localStorageUtil
	 */
	removeItem(key: string): void {
		if (!browser) return; // SSR no-op
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error(
				`Error removing from localStorageUtil with key "${key}":`,
				error
			);
		}
	}

	/**
	 * Clear all items from localStorageUtil
	 */
	clear(): void {
		if (!browser) return; // SSR no-op
		try {
			localStorage.clear();
		} catch (error) {
			console.error('Error clearing localStorageUtil:', error);
		}
	}

	/**
	 * Check if a key exists in localStorageUtil
	 */
	hasItem(key: string): boolean {
		if (!browser) return false;
		try {
			return localStorage.getItem(key) !== null;
		} catch (error) {
			console.error(
				`Error checking localStorageUtil for key "${key}":`,
				error
			);
			return false;
		}
	}
}
