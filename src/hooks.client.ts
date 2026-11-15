import { installGlobalFetchPerformance } from '$lib/util/client-fetch-cache.util';

installGlobalFetchPerformance();

const SW_URL = '/medora-sw.js';

export async function registerMedoraServiceWorker(): Promise<void> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return;
	}
	try {
		await navigator.serviceWorker.register(SW_URL, { scope: '/' });
	} catch (err) {
		console.warn('[sw] registration failed', err);
	}
}

void registerMedoraServiceWorker();