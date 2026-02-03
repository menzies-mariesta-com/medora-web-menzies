import { env } from '$env/dynamic/private';
import argon2 from 'argon2';

// Argon2id configuration for Better Auth email/password hashing (values from env with sane defaults)
const argon2Options: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: Number(env.ARGON2_MEMORY_COST ?? 64 * 1024), // 64 MiB default
	timeCost: Number(env.ARGON2_TIME_COST ?? 3), // iterations
	parallelism: Number(env.ARGON2_PARALLELISM ?? 4),
	hashLength: Number(env.ARGON2_HASH_LENGTH ?? 32) // 32-byte hash by default
};

export class PasswordHashUtil {
	async hash(password: string): Promise<string> {
		return argon2.hash(password, argon2Options);
	}

	async verify(data: { password: string; hash: string }): Promise<boolean> {
		const { password, hash } = data;
		return argon2.verify(hash, password);
	}
}