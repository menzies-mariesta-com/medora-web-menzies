---
name: prettier-config
description: Configure Prettier using advanced options (including Svelte + Tailwind plugins) and align formatting changes with the repo's formatting conventions. Use when the user asks about Prettier configuration, Prettier formatting failures, or how to tune Prettier behavior per file type via overrides.
---

# Prettier Config (Advanced)

## What this skill optimizes for

- Produce formatting that matches the repo's existing Prettier setup (your `.prettierrc`)
- Use advanced Prettier options only when they change real formatting outcomes
- Keep diffs clean: avoid mixing formatting-only edits with unrelated code changes

## Quick start (this repo)

- Your canonical Prettier config is `.prettierrc`.
- Your format scripts:
  - `npm run format` (writes)
  - `npm run lint` (runs `prettier --check .` + `eslint .`)

Expected repo defaults in `.prettierrc`:

- `useTabs: true`
- `singleQuote: true`
- `trailingComma: "none"`
- `printWidth: 70`
- `plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"]`
- `overrides` for `*.svelte` to use `parser: "svelte"`
- `tailwindStylesheet: "./src/routes/layout.css"`

## When to use (decision triggers)

Use this skill when the user:

- Asks “how do I configure Prettier?” or “which option should I set?”
- Mentions Prettier failures like `prettier --check` or “formatting keeps changing”
- Needs per-file formatting via `overrides` (e.g. `.svelte`, `.md`, `.js`/`.ts`)
- Asks how Tailwind classes should be formatted (via `prettier-plugin-tailwindcss`)

## Advanced configuration workflow

1. Start from config precedence
   - Prefer the repo config file(s) (`.prettierrc*`, `prettier.config.*`, or `package.json` `prettier` field).
   - Only use `--config` when the user explicitly wants a non-default config.
2. Decide the scope of the change
   - Global formatting preference → set top-level options.
   - Language/file-specific behavior → add an `overrides` entry with `files` patterns.
3. Ensure the right parser/plugin is in play
   - Svelte files: keep the `prettier-plugin-svelte` plugin and the `*.svelte` override with `parser: "svelte"`.
   - Tailwind class formatting: keep `prettier-plugin-tailwindcss` and set `tailwindStylesheet` (and any plugin-specific Tailwind options) consistently.
4. Validate changes using the repo commands
   - Run `npm run format` after updating config.
   - Re-check with `npm run lint` (to ensure formatting and ESLint remain compatible).

## Option discipline (advanced “all options” mode)

When the user asks to “configure all the options”, do this instead of guessing:

1. Ask which file types matter (examples: `*.svelte`, `*.ts/tsx`, `*.css`, `*.md`).
2. Ask whether they want changes aligned to the repo defaults or a completely new style.
3. Then:
   - Use `prettier --help` to enumerate core Prettier CLI/config options for the installed version.
   - Include plugin-specific options (Svelte plugin, Tailwind plugin) referenced by those tools or docs.
   - For any option that does not affect their file types, default to “leave unchanged”.

## Output formatting requirements

When responding, prefer:

- A minimal `.prettierrc` patch (only the necessary option changes)
- Clear `overrides` blocks for file-type changes
- Commands the user can run to verify (e.g. `npm run format`)

## Common pitfalls

- Fighting Prettier/ESLint responsibilities: formatting stays in Prettier; lint rules stay in ESLint.
- Tailwind plugin formatting differs without the correct `tailwindStylesheet` (or Tailwind config).
- Svelte formatting not taking effect when the `*.svelte` override is missing or parser/plugin is wrong.

## Additional resources

- For config discovery flags, see `reference.md`.
- For copy-ready config scenarios, see `examples.md`.
