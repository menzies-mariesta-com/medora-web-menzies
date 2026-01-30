<script lang="ts">
	import { page } from '$app/state';
	import GQuickTool from '$lib/component/global/GQuickTool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>
		{m.heka()}
	</title>
</svelte:head>

Zarni
<div class="my-web">
	<div class="my-main">
		{@render children()}
	</div>
</div>

<GQuickTool />

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
