/** Cache-Control helpers for authenticated JSON GET responses. */

export function privateJsonCacheHeaders(
	maxAgeSeconds: number,
	staleWhileRevalidateSeconds?: number
): Record<string, string> {
	const swr = staleWhileRevalidateSeconds ?? maxAgeSeconds;
	return {
		'Cache-Control': `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${swr}`
	};
}