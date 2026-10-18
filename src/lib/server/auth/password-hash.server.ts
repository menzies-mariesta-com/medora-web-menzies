import { env } from '$env/dynamic/private';
import argon2 from 'argon2';

/** Argon2id for Better Auth email/password hashing (env-tuned, safe defaults). */
const argon2Options: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: Number(env.ARGON2_MEMORY_COST ?? 64 * 1024),
	timeCost: Number(env.ARGON2_TIME_COST ?? 3),
	parallelism: Number(env.ARGON2_PARALLELISM ?? 4),
	hashLength: Number(env.ARGON2_HASH_LENGTH ?? 32)
};

export class PasswordHashUtil {
	async hash(password: string): Promise<string> {
		return argon2.hash(password, argon2Options);
	}

	async verify(data: {
		password: string;
		hash: string;
	}): Promise<boolean> {
		const { password, hash } = data;
		return argon2.verify(hash, password);
	}
}
