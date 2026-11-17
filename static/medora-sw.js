/* Medora performance SW — static assets only (no authenticated /api; avoids cross-user cache bleed). */
const VERSION = 'medora-perf-v2';
const STATIC_CACHE = `${VERSION}-static`;

const PRECACHE_URLS = [
	'/medora-logo.svg',
	'/medora-bootstrap-wash-theme.css',
	'/medora-bootstrap-font.css',
	'/medora-bootstrap-loading.css'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(k) =>
								k.startsWith('medora-perf-') &&
								k !== STATIC_CACHE
						)
						.map((k) => caches.delete(k))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	const url = new URL(req.url);
	if (req.method !== 'GET') return;

	if (url.pathname.startsWith('/_app/immutable/')) {
		event.respondWith(
			caches.open(STATIC_CACHE).then((cache) =>
				cache.match(req).then(
					(hit) =>
						hit ||
						fetch(req).then((res) => {
							cache.put(req, res.clone());
							return res;
						})
				)
			)
		);
		return;
	}

	if (PRECACHE_URLS.includes(url.pathname)) {
		event.respondWith(
			caches.open(STATIC_CACHE).then((cache) =>
				cache.match(req).then((hit) => hit || fetch(req))
			)
		);
	}
});