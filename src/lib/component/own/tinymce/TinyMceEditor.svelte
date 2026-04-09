<!--
  Thin wrapper around @tinymce/tinymce-svelte for SvelteKit: browser-only mount,
  PUBLIC_TINYMCE_API_KEY, and sensible defaults. Merge `conf` over defaults.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import Editor from '@tinymce/tinymce-svelte';

	/** TinyMCE init options; merged shallowly over defaults (later keys win). */
	type TinyMceConf = Record<string, unknown>;

	let {
		value = $bindable(''),
		disabled = false,
		readonly = false,
		placeholder = '',
		className = '',
		menubar = false,
		id = `tinymce-${crypto.randomUUID()}`,
		apiKey =
			typeof env.PUBLIC_TINYMCE_API_KEY === 'string' &&
			env.PUBLIC_TINYMCE_API_KEY
				? env.PUBLIC_TINYMCE_API_KEY
				: 'no-api-key',
		channel = '8',
		conf: confUser = {} as TinyMceConf,
		cssClass = 'tinymce-editor-wrap',
		modelEvents = 'change input undo redo'
	} = $props<{
		value?: string;
		disabled?: boolean;
		readonly?: boolean;
		placeholder?: string;
		className?: string;
		menubar?: boolean;
		id?: string;
		apiKey?: string;
		channel?: string;
		conf?: TinyMceConf;
		cssClass?: string;
		modelEvents?: string;
	}>();

	const defaultConf: TinyMceConf = {
		height: 400,
		min_height: 200,
		statusbar: true,
		// Disable trial/promotion banners (Tiny Cloud: `onboarding`, OSS: `promotion`).
		// Docs: https://www.tiny.cloud/docs/tinymce/latest/promotions/
		onboarding: false,
		promotion: false,
		plugins: [
			'advlist',
			'autoresize',
			'autolink',
			'anchor',
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
			'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | forecolor backcolor | link image table | removeformat | code fullscreen help',
		autoresize_bottom_margin: 24,
		autoresize_overflow_padding: 0,
		content_style:
			'body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; }'
	};

	const mergedConf = $derived({
		...defaultConf,
		menubar,
		placeholder,
		...confUser
	});
</script>

<div class={className}>
	{#if browser}
		<Editor
			{id}
			{apiKey}
			{channel}
			bind:value
			{disabled}
			{readonly}
			{cssClass}
			conf={mergedConf}
			{modelEvents}
		/>
	{/if}
</div>

<style>
	:global(.tinymce-editor-wrap .tox-tinymce) {
		border-radius: var(--radius-box, 0.5rem);
	}
</style>
