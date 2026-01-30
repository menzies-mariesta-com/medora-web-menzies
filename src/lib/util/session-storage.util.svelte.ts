export class SessionStorageUtil {
	constructor() {}

	setItem<T>(key: string, value: T): void {
		try {
			const stringValue =
				typeof value === 'string' ? value : JSON.stringify(value);
			sessionStorage.setItem(key, stringValue);
		} catch (error) {
			console.error(
				`Error saving to sessionStorage with key "${key}":`,
				error
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
			console.error(
				`Error reading from sessionStorage with key "${key}":`,
				error
			);
			return null;
		}
	}

	removeItem(key: string): void {
		try {
			sessionStorage.removeItem(key);
		} catch (error) {
			console.error(
				`Error removing from sessionStorage with key "${key}":`,
				error
			);
		}
	}

	clear(): void {
		try {
			sessionStorage.clear();
		} catch (error) {
			console.error('Error clearing sessionStorage:', error);
		}
	}
}
