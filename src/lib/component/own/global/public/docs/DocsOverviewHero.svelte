<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
</script>

<div
	class="relative overflow-hidden rounded-box border border-ink-border bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 p-6 sm:p-10"
>
	<p class="text-xs font-semibold uppercase tracking-wide text-primary">
		{msg.docs_hero_ack()}
	</p>
	<h1 class="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
		{msg.docs_hero_title()}
		<span class="badge badge-outline badge-sm align-middle">{msg.docs_version_badge()}</span>
	</h1>
	<p class="mt-3 max-w-2xl text-base text-base-content/80 leading-relaxed">
		{msg.docs_hero_subtitle()}
	</p>
	<div class="mt-6 flex flex-wrap gap-2">
		<WashButton
			type="button"
			className="btn-primary cursor-pointer"
			onClick={() => {
				window.location.href = '/docs/workflows/registration-patient-registration';
			}}
		>
			{msg.docs_hero_cta_workflows()}
		</WashButton>
		<WashButton
			type="button"
			className="btn-outline cursor-pointer"
			onClick={() => {
				window.location.href = '/docs/guides/getting-started';
			}}
		>
			{msg.docs_hero_cta_guides()}
		</WashButton>
	</div>
</div>
