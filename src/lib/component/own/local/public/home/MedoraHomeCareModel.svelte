<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	const stages = $derived([
		{
			title: m.home_model_platform_title(),
			body: m.home_model_platform_body()
		},
		{
			title: m.home_model_hospital_title(),
			body: m.home_model_hospital_body()
		},
		{
			title: m.home_model_staff_title(),
			body: m.home_model_staff_body()
		},
		{
			title: m.home_model_patients_title(),
			body: m.home_model_patients_body()
		}
	]);
</script>

<section
	id="care-model"
	class="scroll-mt-24 px-4 py-20 sm:px-6"
	aria-labelledby="model-heading"
>
	<div class="mx-auto max-w-6xl">
		<p
			class="text-sm font-medium tracking-wide text-[var(--medora-teal)] uppercase"
		>
			{m.home_model_eyebrow()}
		</p>
		<h2
			id="model-heading"
			class="mt-2 max-w-2xl text-3xl font-semibold text-[var(--medora-ink)] sm:text-4xl"
		>
			{m.home_model_heading()}
		</h2>
		<p class="mt-3 max-w-xl text-[var(--medora-ink)]/70">
			{m.home_model_lead()}
		</p>
		<ol class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each stages as stage, i (stage.title)}
				<li
					class="flex flex-col gap-3 rounded-2xl bg-[var(--medora-mint)]/50 p-5"
				>
					<span
						class="inline-flex size-8 items-center justify-center rounded-full bg-[var(--medora-teal)] text-sm font-semibold text-white"
					>
						{i + 1}
					</span>
					<h3 class="text-lg font-semibold text-[var(--medora-ink)]">
						{stage.title}
					</h3>
					<p class="text-sm leading-relaxed text-[var(--medora-ink)]/70">
						{stage.body}
					</p>
				</li>
			{/each}
		</ol>
	</div>
</section>
