<script lang="ts">
	import type { Snippet } from 'svelte';
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';

	/**
	 * Menzies Design Auth Screen “Hero plus form” (Templates → Auth Screen → Split).
	 */
	let {
		headline,
		body,
		children
	}: {
		headline: string;
		body: string;
		children: Snippet;
	} = $props();
</script>

<div class="hero min-h-[min(32rem,80vh)] w-full rounded-box">
	<div
		class="hero-content w-full max-w-5xl flex-col gap-8 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
	>
		<div class="max-w-md text-center lg:text-left">
			<p class="label-ink mb-2">
				<MedoraBrandWordmark className="text-lg" />
			</p>
			<h2 class="font-display text-3xl font-bold md:text-4xl">
				{headline}
			</h2>
			<p class="py-4 text-sm text-ink-muted md:text-base">
				{body}
			</p>
		</div>

		<div class="w-full max-w-sm shrink-0">
			{@render children()}
		</div>
	</div>
</div>
