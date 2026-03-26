# Argon2 Quick Reference

## Option units (common gotchas)

- `memoryCost`: KiB (so `64 * 1024` is 64 MiB)
- `timeCost`: number of iterations
- `parallelism`: number of parallel lanes/threads
- `hashLength`: output length in bytes

## Hashing vs verifying

- `argon2.hash(password, options)` returns a full encoded hash string (includes salt + parameters).
- `argon2.verify(hash, password)` returns `boolean` for password correctness.

## Error handling

If `verify` inputs can be invalid (missing/garbled hash), either:

- let the error bubble for server-only flows, or
- catch and treat as `false` to avoid leaking details to clients.
