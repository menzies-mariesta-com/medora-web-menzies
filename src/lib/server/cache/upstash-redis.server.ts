import { Redis } from '@upstash/redis';
import {
	getUpstashRedisRestToken,
	getUpstashRedisRestUrl,
	isUpstashRedisConfigured
} from '$lib/config/redis.config';

let client: Redis | null = null;

export function getUpstashRedis(): Redis | null {
	if (!isUpstashRedisConfigured()) return null;
	if (!client) {
		client = new Redis({
			url: getUpstashRedisRestUrl()!,
			token: getUpstashRedisRestToken()!
		});
	}
	return client;
}