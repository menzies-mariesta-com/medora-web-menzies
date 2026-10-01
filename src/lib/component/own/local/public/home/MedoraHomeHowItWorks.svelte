<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	const steps = $derived([
		{
			n: '01',
			title: m.home_how_step1_title(),
			body: m.home_how_step1_body()
		},
		{
			n: '02',
			title: m.home_how_step2_title(),
			body: m.home_how_step2_body()
		},
		{
			n: '03',
			title: m.home_how_step3_title(),
			body: m.home_how_step3_body()
		},
		{
			n: '04',
			title: m.home_how_step4_title(),
			body: m.home_how_step4_body()
		}
	]);
</script>

<section
	id="how-it-works"
	class="scroll-mt-24 px-4 py-20 sm:px-6"
	aria-labelledby="how-heading"
>
	<div class="mx-auto max-w-6xl">
		<p
			class="text-sm font-medium tracking-wide text-[var(--medora-teal)] uppercase"
		>
			{m.home_how_eyebrow()}
		</p>
		<h2
			id="how-heading"
			class="mt-2 max-w-xl text-3xl font-semibold text-[var(--medora-ink)] sm:text-4xl"
		>
			{m.home_how_heading()}
		</h2>
		<p class="mt-3 max-w-lg text-[var(--medora-ink)]/70">
			{m.home_how_lead()}
		</p>
		<ol class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			{#each steps as step (step.n)}
				<li class="relative">
					<span
						class="font-display text-3xl font-semibold text-[var(--medora-mint-deep)]"
					>
						{step.n}
					</span>
					<h3 class="mt-2 text-lg font-semibold text-[var(--medora-ink)]">
						{step.title}
					</h3>
					<p class="mt-2 text-sm leading-relaxed text-[var(--medora-ink)]/70">
						{step.body}
					</p>
				</li>
			{/each}
		</ol>
	</div>
</section>
