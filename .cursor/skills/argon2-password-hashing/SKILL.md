---
name: argon2-password-hashing
description: Hash and verify passwords using the `argon2` library in TypeScript/Node, and wire it into auth flows (e.g. Better Auth). Use when the user mentions `argon2`, `argon2id`, `argon2.hash`, `argon2.verify`, or `ARGON2_*` configuration.
---

# Argon2 Password Hashing

## Responsibilities

- Provide safe Argon2id password hashing and verification.
- Recommend repo-aligned defaults from `ARGON2_MEMORY_COST`, `ARGON2_TIME_COST`, `ARGON2_PARALLELISM`, `ARGON2_HASH_LENGTH`.

## Core implementation pattern

Use:

- `import argon2 from 'argon2'`
- `argon2.argon2id` for `type`
- `await argon2.hash(password, options)` to produce a string hash
- `await argon2.verify(hash, password)` to validate

Example (generic TypeScript):

```ts
import argon2 from 'argon2';

const options: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: 64 * 1024, // KiB (64 MiB)
	timeCost: 3,
	parallelism: 4,
	hashLength: 32 // bytes
};

export async function hashPassword(
	password: string
): Promise<string> {
	return argon2.hash(password, options);
}

export async function verifyPassword(
	hash: string,
	password: string
): Promise<boolean> {
	return argon2.verify(hash, password);
}
```

## Repo-aligned defaults (if env vars exist)

- `memoryCost`: `Number(env.ARGON2_MEMORY_COST ?? 64 * 1024)`
- `timeCost`: `Number(env.ARGON2_TIME_COST ?? 3)`
- `parallelism`: `Number(env.ARGON2_PARALLELISM ?? 4)`
- `hashLength`: `Number(env.ARGON2_HASH_LENGTH ?? 32)`

When the repo already has `PasswordHashUtil` (or similar), prefer adapting/wrapping it rather than re-implementing argon2 calls in multiple places.

## Better Auth wiring (when asked)

If the user is using `better-auth`, integrate via its `emailAndPassword.password` callbacks:

- `hash: (password) => passwordHashUtil.hash(password)`
- `verify: ({ password, hash }) => passwordHashUtil.verify({ password, hash })`

## Implementation workflow

1. Confirm you are hashing user passwords (not secrets like API keys).
2. Choose Argon2id: `type: argon2.argon2id`
3. Set `memoryCost`, `timeCost`, `parallelism`, `hashLength` (prefer env overrides).
4. Hash with `argon2.hash` (async) and store only the returned hash string.
5. Verify with `argon2.verify` (async) during login/password reset.

## Security checklist

- Never log passwords or raw hashes.
- Use per-user unique salts implicitly (argon2.hash generates them).
- Keep params consistent across the app; document them in env.
- Avoid custom wrappers that accidentally switch between algorithms or option sets.
