import { getUpstashRedis } from '$lib/server/cache/upstash-redis.server';

const TAG_PREFIX = 'medora:cache-tag:';

type MemoryEntry = { expiresAt: number; value: unknown };

const memory = new Map<string, MemoryEntry>();
const memoryTagKeys = new Map<string, Set<string>>();

export type CacheGetOrSetOptions<T> = {
	key: string;
	/** Time-to-live in seconds (L1 + L2). */
	ttlSeconds: number;
	tags?: string[];
	factory: () => Promise<T>;
};

function memoryGet<T>(key: string): T | null {
	const hit = memory.get(key);
	if (!hit) return null;
	if (Date.now() > hit.expiresAt) {
		memory.delete(key);
		return null;
	}
	return hit.value as T;
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
	memory.set(key, {
		value,
		expiresAt: Date.now() + ttlSeconds * 1000
	});
}

function trackMemoryTag(tag: string, key: string): void {
	let set = memoryTagKeys.get(tag);
	if (!set) {
		set = new Set();
		memoryTagKeys.set(tag, set);
	}
	set.add(key);
}

async function redisGet<T>(key: string): Promise<T | null> {
	const redis = getUpstashRedis();
	if (!redis) return null;
	try {
		return (await redis.get<T>(key)) ?? null;
	} catch {
		return null;
	}
}

async function redisSet(
	key: string,
	value: unknown,
	ttlSeconds: number
): Promise<void> {
	const redis = getUpstashRedis();
	if (!redis) return;
	try {
		await redis.set(key, value, { ex: ttlSeconds });
	} catch {
		// L1 still serves; Redis is best-effort across serverless instances.
	}
}

async function registerRedisTag(tag: string, key: string): Promise<void> {
	const redis = getUpstashRedis();
	if (!redis) return;
	try {
		await redis.sadd(`${TAG_PREFIX}${tag}`, key);
	} catch {
		// optional
	}
}

export async function cacheGet<T>(key: string): Promise<T | null> {
	const l1 = memoryGet<T>(key);
	if (l1 !== null) return l1;
	return redisGet<T>(key);
}

export async function cacheSet<T>(
	key: string,
	value: T,
	ttlSeconds: number,
	tags: string[] = []
): Promise<void> {
	memorySet(key, value, ttlSeconds);
	await redisSet(key, value, ttlSeconds);
	for (const tag of tags) {
		trackMemoryTag(tag, key);
		await registerRedisTag(tag, key);
	}
}

/** Read-through cache: process memory → Upstash → factory. */
export async function cacheGetOrSet<T>(
	opts: CacheGetOrSetOptions<T>
): Promise<T> {
	const { key, ttlSeconds, tags = [], factory } = opts;

	const l1 = memoryGet<T>(key);
	if (l1 !== null) return l1;

	const l2 = await redisGet<T>(key);
	if (l2 !== null) {
		memorySet(key, l2, ttlSeconds);
		return l2;
	}

	const value = await factory();
	memorySet(key, value, ttlSeconds);
	await redisSet(key, value, ttlSeconds);
	for (const tag of tags) {
		trackMemoryTag(tag, key);
		await registerRedisTag(tag, key);
	}
	return value;
}

export async function invalidateCacheKey(key: string): Promise<void> {
	memory.delete(key);
	const redis = getUpstashRedis();
	if (!redis) return;
	try {
		await redis.del(key);
	} catch {
		// ignore
	}
}

function invalidateMemoryTag(tag: string): void {
	const keys = memoryTagKeys.get(tag);
	if (!keys) return;
	for (const key of keys) memory.delete(key);
	memoryTagKeys.delete(tag);
}

/** Drop every key registered under a tag (memory + Redis SET index). */
export async function invalidateCacheTag(tag: string): Promise<void> {
	invalidateMemoryTag(tag);
	const redis = getUpstashRedis();
	if (!redis) return;
	const tagKey = `${TAG_PREFIX}${tag}`;
	try {
		const keys = await redis.smembers<string[]>(tagKey);
		if (keys?.length) {
			await redis.del(...keys, tagKey);
		} else {
			await redis.del(tagKey);
		}
	} catch {
		// ignore
	}
}