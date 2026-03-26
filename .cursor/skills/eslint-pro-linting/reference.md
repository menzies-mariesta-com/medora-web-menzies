## Repo facts (keep in mind)

- **Lint command**: `npm run lint` → `prettier --check . && eslint .`
- **Format command**: `npm run format` → `prettier --write .`
- **ESLint config**: `eslint.config.js` (ESLint v10 flat config)
- **Svelte**: `eslint-plugin-svelte` with SvelteKit config imported from `svelte.config.js`
- **TypeScript**: `typescript-eslint` recommended configs; `no-undef` disabled (recommended for TS projects)
- **Ignores**: `.gitignore` is included as ESLint ignores via `includeIgnoreFile(...)`

## Command recipes

### Lint only what changed (fast local iteration)

```bash
npx eslint path/to/file.ts
npx eslint path/to/file.svelte
```

### Auto-fix + verify

```bash
npx eslint . --fix
npx eslint . --max-warnings 0
```

### Debug what config applies to a file

```bash
npx eslint --print-config src/path/to/file.ts > /tmp/eslint-print-config.json
```

### Make unused `eslint-disable` comments visible

```bash
npx eslint . --report-unused-disable-directives
```

## Fast classification: what kind of failure is this?

- **Prettier failure** (`prettier --check` exits non-zero)
  - Fix with `npm run format`
  - Avoid mixing formatting fixes with semantic refactors when possible (keeps diffs clean)

- **ESLint “Parsing error” / “Cannot read tsconfig” / project service errors**
  - In SvelteKit repos, run `svelte-kit sync` (this repo already does it in `npm run check`)
  - Ensure `.svelte-kit/tsconfig.json` exists
  - If a file shouldn’t be type-aware linted, consider scoping it out via `files` blocks or `ignores` in `eslint.config.js`

- **TypeScript-eslint rule errors**
  - Prefer code changes over disabling rules
  - If you must disable a rule:
    - Use the narrowest scope (`// eslint-disable-next-line <rule>` right above the line)
    - Add a short reason in the same line comment if the intent isn’t obvious

- **Svelte plugin rule errors**
  - Ensure the file is actually a Svelte component/module matching the configured patterns
  - If the rule conflicts with formatting, rely on the Prettier integration already present (`eslint-config-prettier` + `svelte.configs.prettier`)

## Changing lint rules safely (flat config)

If you need to adjust lint behavior in this repo:

1. Prefer adding a **targeted `files` block** (e.g. only for `src/lib/server/**`) rather than changing global rules.
2. Keep Prettier and ESLint responsibilities separate:
   - Formatting belongs to Prettier (don’t re-introduce stylistic ESLint rules that Prettier manages).
3. Validate changes by running:

```bash
npm run lint
npm run check
```

## Common “pro linting” habits

- Keep lint runs deterministic: use project scripts over ad-hoc command variations.
- Fix root causes, not symptoms: prefer rewriting code over broad disables.
- Reduce scope before refactoring: lint a single file when iterating.
- When adding new rules, ensure they’re compatible with Svelte + TypeScript type-aware linting.
