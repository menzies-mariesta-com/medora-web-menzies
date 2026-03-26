## Repo-aligned defaults (read this first)

- Canonical config file: `.prettierrc`
- Current `.prettierrc` keys used in formatting decisions:
  - `useTabs: true`
  - `singleQuote: true`
  - `trailingComma: "none"`
  - `printWidth: 70`
  - `plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"]`
  - `overrides`:
    - `files: "*.svelte"` with `options: { parser: "svelte" }`
  - `tailwindStylesheet: "./src/routes/layout.css"`

## How Prettier discovers config (advanced)

Prettier can resolve options from multiple sources; this skill treats config resolution as the first step for “advanced” formatting work.

### Core CLI config flags

- `--config <path>`
  - Path to a Prettier config file (e.g. `.prettierrc`, `package.json`, `prettier.config.js`).
- `--no-config`
  - Do not look for a configuration file.
- `--config-precedence <cli-override|file-override|prefer-file>`
  - Controls evaluation order between CLI flags and config file. Default: `cli-override`.
- `--no-editorconfig`
  - Don’t take `.editorconfig` into account.
- `--find-config-path <path>`
  - Find and print the path to a configuration file for a given input file.
- `--ignore-path <path>`
  - Extra ignore file(s). Defaults include `/.gitignore` and `/.prettierignore`.
- `--plugin <path>`
  - Add a plugin (repeatable). Useful when a plugin isn’t auto-detected.
- `--with-node-modules`
  - Process files inside `node_modules`.

### Debugging what config applies to a file

Use `--find-config-path` to confirm config location:

```bash
npx prettier --find-config-path src/routes/layout.css
```

If the user suspects CLI overrides are winning unexpectedly, adjust precedence:

```bash
npx prettier --config-precedence prefer-file --config .prettierrc --check .
```

## “Configure all options” mode (what to do)

To configure _all_ Prettier options for the user’s installed version, don’t rely on memory:

1. Ask the user whether they want _core Prettier options only_ or also _plugin-specific options_ (Svelte + Tailwind plugins).
2. Have the agent list core options from the installed Prettier CLI:

```bash
npx prettier --help
```

3. If plugin-specific options are required:
   - Ask the user to paste the relevant plugin section(s) from their plugin docs, or
   - Ask for their `prettier-plugin-svelte` / `prettier-plugin-tailwindcss` versions and desired behavior, then request the missing option details.

## Core option categories (advanced, but not plugin-specific)

When tuning Prettier behavior, these are the option groups that most commonly affect output:

### Formatting width, whitespace, and quoting

- `printWidth` (CLI: `--print-width <int>`)
- `useTabs` (CLI: `--use-tabs`)
- `tabWidth` (CLI: `--tab-width <int>`)
- Quote and punctuation:
  - `singleQuote` (CLI: `--single-quote`)
  - `trailingComma` (CLI: `--trailing-comma <all|es5|none>`)
  - `semi` (CLI: `--no-semi` disables semicolons)

### Brackets and HTML/JSX behavior

- `bracketSameLine` (CLI: `--bracket-same-line`)
- `bracketSpacing` (CLI: `--no-bracket-spacing` disables spaces in brackets)
- `arrowParens` (CLI: `--arrow-parens <always|avoid>`)
- `jsxSingleQuote` (CLI: `--jsx-single-quote`)
- `vueIndentScriptAndStyle` (CLI: `--vue-indent-script-and-style`)

### Embedded language formatting

- `embeddedLanguageFormatting` (CLI: `--embedded-language-formatting <auto|off>`)
- `htmlWhitespaceSensitivity` (CLI: `--html-whitespace-sensitivity <css|strict|ignore>`)

### Parser control

- `parser` (CLI: `--parser <...>`)
- `overrides[]` (choose options by filename/glob)

## Recommended advanced workflow patterns

### Pattern A: Add a single override

Use when only one language (like Svelte) needs parser changes:

```json
{
	"overrides": [
		{
			"files": "*.svelte",
			"options": { "parser": "svelte" }
		}
	]
}
```

### Pattern B: Minimal config diffs

When the user asks “make it advanced”, first produce a minimal patch:

1. Only change the specific options that address their complaint.
2. Keep `plugins`, `tailwindStylesheet`, and Svelte parser overrides consistent with `.prettierrc`.

### Pattern C: Verification before bigger changes

Use `--check`/`--list-different` before a write:

```bash
npx prettier --check .
npx prettier --list-different .
```
