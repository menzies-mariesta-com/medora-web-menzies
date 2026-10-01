<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	const modules = $derived([
		{
			title: m.home_modules_registration_title(),
			body: m.home_modules_registration_body()
		},
		{
			title: m.home_modules_clinical_title(),
			body: m.home_modules_clinical_body()
		},
		{
			title: m.home_modules_inventory_title(),
			body: m.home_modules_inventory_body()
		},
		{
			title: m.home_modules_admin_title(),
			body: m.home_modules_admin_body()
		}
	]);
</script>

<section
	id="modules"
	class="scroll-mt-24 px-4 py-20 sm:px-6"
	aria-labelledby="modules-heading"
>
	<div class="mx-auto max-w-6xl">
		<p
			class="text-sm font-medium tracking-wide text-[var(--medora-teal)] uppercase"
		>
			{m.home_modules_eyebrow()}
		</p>
		<h2
			id="modules-heading"
			class="mt-2 max-w-xl text-3xl font-semibold text-[var(--medora-ink)] sm:text-4xl"
		>
			{m.home_modules_heading()}
		</h2>
		<p class="mt-3 max-w-lg text-[var(--medora-ink)]/70">
			{m.home_modules_lead()}
		</p>
		<ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each modules as item (item.title)}
				<li
					class="rounded-2xl border border-[var(--medora-ink)]/10 bg-base-100/50 p-6 backdrop-blur-sm"
				>
					<h3 class="text-lg font-semibold text-[var(--medora-ink)]">
						{item.title}
					</h3>
					<p class="mt-2 text-sm leading-relaxed text-[var(--medora-ink)]/70">
						{item.body}
					</p>
				</li>
			{/each}
		</ul>
	</div>
</section>
