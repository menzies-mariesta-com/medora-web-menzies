// private env only — Upstash Redis REST (optional; L1 memory cache still works without it)

const URL_KEYS = ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'] as const;
const TOKEN_KEYS = [
	'UPSTASH_REDIS_REST_TOKEN',
	'KV_REST_API_TOKEN'
] as const;

function firstNonEmpty(keys: readonly string[]): string | undefined {
	for (const key of keys) {
		const value = process.env[key]?.trim();
		if (value) return value;
	}
	return undefined;
}

export function getUpstashRedisRestUrl(): string | undefined {
	return firstNonEmpty(URL_KEYS);
}

export function getUpstashRedisRestToken(): string | undefined {
	return firstNonEmpty(TOKEN_KEYS);
}

export function isUpstashRedisConfigured(): boolean {
	return Boolean(
		getUpstashRedisRestUrl() && getUpstashRedisRestToken()
	);
}