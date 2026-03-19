import { log } from '$lib/logger';

export class SessionStorageUtil {
	constructor() {}

	setItem<T>(key: string, value: T): void {
		try {
			const stringValue =
				typeof value === 'string' ? value : JSON.stringify(value);
			sessionStorage.setItem(key, stringValue);
		} catch (error) {
			log.error(
				`Error saving to sessionStorage key "${key}"`,
				error instanceof Error ? error : undefined
			);
		}
	}

	getItem<T>(key: string): T | null {
		try {
			const item = sessionStorage.getItem(key);
			if (!item) return null;

			try {
				return JSON.parse(item) as T;
			} catch {
				return item as unknown as T;
			}
		} catch (error) {
			log.error(
				`Error reading sessionStorage key "${key}"`,
				error instanceof Error ? error : undefined
			);
			return null;
		}
	}

	removeItem(key: string): void {
		try {
			sessionStorage.removeItem(key);
		} catch (error) {
			log.error(
				`Error removing sessionStorage key "${key}"`,
				error instanceof Error ? error : undefined
			);
		}
	}

	clear(): void {
		try {
			sessionStorage.clear();
		} catch (error) {
			log.error(
				'Error clearing sessionStorage',
				error instanceof Error ? error : undefined
			);
		}
	}
}
