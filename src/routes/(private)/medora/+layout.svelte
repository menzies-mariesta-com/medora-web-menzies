<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();
</script>

<!-- Defense-in-depth: private clinical / admin app must not be indexed. -->
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>{m.menzies_medora()}</title>
</svelte:head>

{@render children?.()}
