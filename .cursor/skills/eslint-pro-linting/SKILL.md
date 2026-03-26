---
name: eslint-pro-linting
description: Lints JavaScript/TypeScript/Svelte projects professionally using ESLint v10 flat config and Prettier. Use when the user mentions ESLint, linting, eslint errors/warnings, prettier check failures, "npm run lint", or asks to "fix lint".
---

# ESLint Pro Linting (Heka)

## Quick start (this repo)

- Run the canonical lint script:

```bash
npm run lint
```

- If you need to focus on ESLint only (skip Prettier check), run:

```bash
npx eslint .
```

- Auto-fix what ESLint can fix safely:

```bash
npx eslint . --fix
```

## Operating rules

- Prefer the repo script `npm run lint` for CI parity. In this repo it runs `prettier --check .` then `eslint .`.
- Treat Prettier vs ESLint as separate signals:
  - If Prettier fails, use `npm run format` (or `npx prettier --write <path>`).
  - If ESLint fails, fix the underlying rule violations (or use `--fix` where applicable).
- Do not fight the config: this repo uses **ESLint v10 flat config** in `eslint.config.js` (not `.eslintrc*`).
- Respect ignores: ESLint pulls ignores from `.gitignore` via `includeIgnoreFile(...)` in `eslint.config.js`.

## Triage workflow (professional linting)

1. Run `npm run lint` and classify failures:
   - Prettier formatting failures
   - ESLint rule violations
2. If ESLint errors are noisy or unclear, re-run with more detail:

```bash
npx eslint . --max-warnings 0 --report-unused-disable-directives
```

3. If the failures are localized, lint the smallest scope:

```bash
npx eslint src/path/to/file.ts
npx eslint src/path/to/Component.svelte
```

4. Apply mechanical fixes first:
   - `npx eslint <scope> --fix`
   - `npm run format` (for Prettier)
5. Only after the lint output is clean, proceed with refactors or new work.

## Svelte + TypeScript specifics (this repo)

- Files covered: `**/*.svelte`, `**/*.svelte.ts`, `**/*.svelte.js`.
- The config enables TypeScript project parsing for Svelte via `parserOptions.projectService = true` and `extraFileExtensions: ['.svelte']`.
- If you see parser/project errors, check that `svelte-kit sync` has been run recently and that `.svelte-kit/tsconfig.json` exists (the repo already uses `npm run check` for this).

## When you need deeper guidance

See `reference.md` for:

- Common ESLint error categories and the fastest fixes
- Svelte/TypeScript parser troubleshooting
- Rule overrides and how to change `eslint.config.js` safely
