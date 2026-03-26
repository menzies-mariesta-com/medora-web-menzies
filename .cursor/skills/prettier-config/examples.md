## Example 1: Align with repo defaults (recommended)

Use this when the user is “close enough” but formatting is inconsistent.

Repo-oriented config (keep this as-is unless the user asked for a specific change):

```json
{
	"useTabs": true,
	"singleQuote": true,
	"trailingComma": "none",
	"printWidth": 70,
	"plugins": [
		"prettier-plugin-svelte",
		"prettier-plugin-tailwindcss"
	],
	"overrides": [
		{
			"files": "*.svelte",
			"options": { "parser": "svelte" }
		}
	],
	"tailwindStylesheet": "./src/routes/layout.css"
}
```

Verify:

```bash
npm run format
npm run lint
```

## Example 2: Advanced override for Markdown/MDX

Use this when the user wants different prose wrapping or quoting rules for docs, without affecting code.

```json
{
	"overrides": [
		{
			"files": "*.md",
			"options": {
				"proseWrap": "always",
				"printWidth": 80
			}
		}
	]
}
```

Verify:

```bash
npx prettier --check "**/*.md"
```

## Example 3: Plugin-aligned Tailwind formatting

Use this when Tailwind class formatting looks wrong or differs between files.

Repo-aligned Tailwind plugin wiring:

```json
{
	"plugins": ["prettier-plugin-tailwindcss"],
	"tailwindStylesheet": "./src/routes/layout.css"
}
```

If the user also has a Tailwind config file or wants class sorting tuned, the plugin-specific options must come from the plugin docs; ask the user to paste the relevant plugin configuration section from their Tailwind/Prettier plugin setup.
