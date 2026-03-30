---
name: tinymce-svelte
description: Integrates TinyMCE in Svelte and SvelteKit using @tinymce/tinymce-svelte and Tiny Cloud or self-hosted TinyMCE. Summarizes the official Svelte component API (props, two-way bindings, events), deployment choices, and SvelteKit constraints. Use when the user mentions TinyMCE, tinymce-svelte, Tiny Cloud, rich text or WYSIWYG editors, editor plugins, toolbar or menubar configuration, or HTML content editing.
---

# TinyMCE (Svelte & SvelteKit)

## Documentation source of truth

Official TinyMCE 8 docs live under:

- **Docs home / overview**: [TinyMCE 8 Documentation](https://www.tiny.cloud/docs/tinymce/latest/)
- **Svelte + Tiny Cloud (quick start)**: [Using TinyMCE from the Tiny Cloud CDN with Svelte](https://www.tiny.cloud/docs/tinymce/latest/svelte-cloud/)
- **Svelte component API (props, bindings, events)**: [TinyMCE Svelte integration technical reference](https://www.tiny.cloud/docs/tinymce/latest/svelte-ref/)

For a wider URL map (bundling, CSP, plugins, licensing), see [reference.md](reference.md).

## Choose a deployment

| Approach | When | Key detail |
|----------|------|------------|
| **Tiny Cloud** | Fastest start; CDN loads editor | Set a real [Tiny Cloud API key](https://www.tiny.cloud/auth/signup/) on `<Editor apiKey="…" />` (replace `no-api-key`). Manage keys in the [Tiny Account Dashboard](https://www.tiny.cloud/my-account/). |
| **Self-hosted (npm / zip)** | Full control, offline-friendly | Use `scriptSrc` pointing at `tinymce.min.js` and usually `licenseKey` (`gpl` or commercial `T8LK:…` per docs). See [Self-hosted quick start](https://www.tiny.cloud/docs/tinymce/latest/installation-self-hosted/) and [Svelte package manager](https://www.tiny.cloud/docs/tinymce/latest/svelte-pm/). |
| **Bundled with Vite** | Ship TinyMCE with the app bundle | Follow [Bundling with Vite](https://www.tiny.cloud/docs/tinymce/latest/vite-es6-npm/). |

`channel` pins the Tiny Cloud release line (default `'8'`). See [Specify editor version & plugins](https://www.tiny.cloud/docs/tinymce/latest/editor-plugin-version/).

## Install (Cloud + Svelte)

```sh
npm install @tinymce/tinymce-svelte
```

Minimal usage pattern (from [svelte-cloud](https://www.tiny.cloud/docs/tinymce/latest/svelte-cloud/)):

```svelte
<script>
	import Editor from '@tinymce/tinymce-svelte';

	let conf = {
		height: 500,
		menubar: false,
		plugins: [
			'advlist',
			'autolink',
			'lists',
			'link',
			'image',
			'charmap',
			'anchor',
			'searchreplace',
			'visualblocks',
			'code',
			'fullscreen',
			'insertdatetime',
			'media',
			'table',
			'preview',
			'help',
			'wordcount'
		],
		toolbar:
			'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help'
	};
</script>

<Editor apiKey="no-api-key" value="<p>Initial content</p>" {conf} />
```

Replace `no-api-key` with a valid Cloud API key in real deployments.

## `@tinymce/tinymce-svelte` component (summary)

Full detail: [svelte-ref](https://www.tiny.cloud/docs/tinymce/latest/svelte-ref/).

**Props**

| Prop | Role |
|------|------|
| `apiKey` | Tiny Cloud API key (Cloud deployments). Default `'no-api-key'`. |
| `licenseKey` | Self-hosted / GPL / commercial license string. Often omitted when using Cloud-only. |
| `channel` | Cloud channel, e.g. `'8'`, `'8-dev'`, `'8.3'`. |
| `id` | Editor id for `tinymce.get(id)`. Default auto UUID. |
| `inline` | Inline editing mode (boolean). |
| `disabled` | Disable editing (boolean). |
| `readonly` | Read-only mode (boolean). |
| `scriptSrc` | URL to `tinymce.min.js` when not using Cloud (self-hosted). |
| `conf` | Object passed to TinyMCE `init` (plugins, toolbar, content style, etc.). |
| `modelEvents` | Which editor events sync to `value` (default includes `input change undo redo`). |
| `value` | HTML content string. |
| `text` | Plain-text mirror (read-only from editor side when bound). |

**Bindings**

- `bind:value` — two-way HTML content.
- `bind:text` — plain text out from the editor (changes flow editor → variable only).

**Events**

- Use Svelte event forwarding: `on:change`, `on:init`, etc.
- **Event names must be lowercase** (they are case-sensitive).
- Handler receives `(event, editor)` per [svelte-ref](https://www.tiny.cloud/docs/tinymce/latest/svelte-ref/).

Examples and live API surface: [tinymce-svelte Storybook](https://tinymce.github.io/tinymce-svelte/).

## SvelteKit-specific notes

- TinyMCE is **browser-only**. Guard rendering with `import { browser } from '$app/environment'` or mount the editor only after `onMount` so SSR does not execute TinyMCE.
- Prefer **`PUBLIC_` env vars** for a Cloud API key exposed to the client, e.g. `PUBLIC_TINYMCE_API_KEY`, and pass `apiKey={import.meta.env.PUBLIC_TINYMCE_API_KEY}`.
- **Never trust editor HTML on the server** without sanitization/allowlisting appropriate to your threat model; treat output like any rich-text user input.
- If the app uses a strict **CSP**, read the security guide’s CSP section: [Security](https://www.tiny.cloud/docs/tinymce/latest/security/) (see also [reference.md](reference.md)).

## Agent workflow

1. Confirm **Cloud vs self-hosted** and whether the key is **public (client)** vs server-only (TinyMCE Cloud keys are normally used from the client per their integration pattern).
2. Add `@tinymce/tinymce-svelte`, wire `apiKey` or `scriptSrc` + `licenseKey`, and put editor options in `conf` using [basic setup](https://www.tiny.cloud/docs/tinymce/latest/basic-setup/) and [plugins](https://www.tiny.cloud/docs/tinymce/latest/plugins/) docs.
3. Use `bind:value` (or controlled `value` + events) for form submission; validate/sanitize stored HTML.
4. For bundler/skin/plugin path issues, open **Bundling** and **Vite** pages from [reference.md](reference.md).

## Examples in official docs

- [General examples index](https://www.tiny.cloud/docs/tinymce/latest/examples/)
- [Basic example](https://www.tiny.cloud/docs/tinymce/latest/full-featured-open-source-demo/)
