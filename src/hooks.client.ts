import {
	installHoverPrefetch,
	rememberPageFetch,
	resetHoverPrefetch
} from '$lib/util/hover-prefetch.util';
import {
	installGlobalFetchPerformance,
	onApiGetObserved,
	onSessionResetObserved
} from '$lib/util/client-fetch-cache.util';

installGlobalFetchPerformance();
// Learn each page's opening read so hover warm-up fetches the exact same URL.
onApiGetObserved((url) => {
	if (typeof window !== 'undefined') {
		rememberPageFetch(window.location.pathname, url);
	}
});
onSessionResetObserved(resetHoverPrefetch);
installHoverPrefetch();

const SW_URL = '/medora-sw.js';

export async function registerMedoraServiceWorker(): Promise<void> {
	if (
		typeof navigator === 'undefined' ||
		!('serviceWorker' in navigator)
	) {
		return;
	}
	try {
		await navigator.serviceWorker.register(SW_URL, { scope: '/' });
	} catch (err) {
		console.warn('[sw] registration failed', err);
	}
}

void registerMedoraServiceWorker();
