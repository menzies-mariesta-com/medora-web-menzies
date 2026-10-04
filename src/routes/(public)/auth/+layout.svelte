<script lang="ts">
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();

	const authTitle = $derived(`${m.auth_sign_in_title()} | ${m.menzies_medora()}`);
</script>

<!-- Auth is public-routable but must not be indexed. -->
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>{authTitle}</title>
</svelte:head>

<!-- Transparent shell: root washShell page-wash + paper-grain shows through. -->
<div
	class="my-auth-shell flex min-h-dvh w-full items-center justify-center p-5"
>
	<div class="my-main w-full">
		<AnimatedPageContent type="fadeUp">
			{@render children?.()}
		</AnimatedPageContent>
	</div>
</div>
