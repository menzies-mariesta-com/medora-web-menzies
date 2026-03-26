---
name: typescript-strict
description: Enforces strict TypeScript best practices in this repo (uses `tsconfig.json` `strict: true`) when working with `.ts`/`.tsx` and Svelte TypeScript files (`.svelte.ts`, `.svelte.js`) or when debugging TypeScript type errors. Use when writing, refactoring, or fixing TypeScript code in this project.
---

# TypeScript Strict Helpers

## What to optimize for

- Correctness under `strict: true` typing (no new `any`, no unsafe casts)
- Safe handling of external/unknown inputs (prefer narrowing and runtime validation when needed)
- Code that fits this repo’s SvelteKit + bundler TypeScript setup (ESM imports, `import type`, etc.)

## Pre-change checklist (quick, strict)

1. Identify the data boundary: is this value coming from I/O (HTTP, DB, form, storage, third-party SDK)?
2. If it’s a boundary value, treat it as `unknown` and narrow:
   - Prefer type guards or schema parsing.
   - If the value is shaped/validated data, use `zod` (this repo has `zod`) to parse and infer types.
3. Avoid `any` entirely.
4. Avoid unsafe assertions (`as Foo`, especially `as unknown as Foo`) unless there is a real guarantee.
5. For discriminated unions, add an exhaustive check using `never`.
6. Prefer `import type` for types-only imports to avoid accidental runtime deps.
7. Use `satisfies` for object literals when you want correctness without losing literal types.
8. Ensure functions/methods have appropriate generics and return types when inference is not reliable.

## Editing rules (guardrails)

- Prefer narrowing over casting: `unknown` -> refine -> typed value.
- If you must cast, keep it local and document the guarantee with a short comment.
- Don’t widen types unnecessarily; avoid “type drops” by using `as const` where appropriate.
- Prefer `readonly` arrays/tuples for data that should not mutate.

## Example fixes

- Replacing `any` with `unknown` + narrowing:

  ```ts
  // Before
  function formatId(x: any) {
  	return String(x);
  }

  // After
  function formatId(x: unknown) {
  	if (typeof x === 'string' || typeof x === 'number')
  		return String(x);
  	return '';
  }
  ```

- Exhaustive discriminated-union handling:

  ```ts
  type Op =
  	| { kind: 'add'; value: number }
  	| { kind: 'remove'; value: number };

  function applyOp(op: Op) {
  	switch (op.kind) {
  		case 'add':
  			return op.value;
  		case 'remove':
  			return -op.value;
  		default: {
  			const _exhaustive: never = op;
  			return _exhaustive;
  		}
  	}
  }
  ```

## Verification (when changes are non-trivial)

- Run `npm run check` (TypeScript via `svelte-check`) to confirm no strict typing regressions.
- Run `npm run lint` if the change might affect formatting or lint rules.

## Output preference

- Respond with code-first changes.
- Only add brief notes when a type assumption or external behavior guarantee is required.
