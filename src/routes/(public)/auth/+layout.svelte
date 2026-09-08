<script lang="ts">
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';

	let { children } = $props();
</script>

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
