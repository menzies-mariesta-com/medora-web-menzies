import { browser } from '$app/environment';
import { log } from '$lib/logger';

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
			log.error(
				`Error saving to localStorage key "${key}"`,
				error instanceof Error ? error : undefined
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
			log.error(
				`Error reading localStorage key "${key}"`,
				error instanceof Error ? error : undefined
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
			log.error(
				`Error removing localStorage key "${key}"`,
				error instanceof Error ? error : undefined
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
			log.error(
				'Error clearing localStorage',
				error instanceof Error ? error : undefined
			);
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
			log.error(
				`Error checking localStorage key "${key}"`,
				error instanceof Error ? error : undefined
			);
			return false;
		}
	}
}
