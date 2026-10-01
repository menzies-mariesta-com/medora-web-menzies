<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	const surfaces = $derived([
		{
			title: m.home_surfaces_nursing_title(),
			body: m.home_surfaces_nursing_body()
		},
		{
			title: m.home_surfaces_consult_title(),
			body: m.home_surfaces_consult_body()
		},
		{
			title: m.home_surfaces_inventory_title(),
			body: m.home_surfaces_inventory_body()
		},
		{
			title: m.home_surfaces_admin_title(),
			body: m.home_surfaces_admin_body()
		}
	]);
</script>

<section
	id="surfaces"
	class="scroll-mt-24 px-4 py-20 sm:px-6"
	aria-labelledby="surfaces-heading"
>
	<div class="mx-auto max-w-6xl">
		<p
			class="text-sm font-medium tracking-wide text-[var(--medora-teal)] uppercase"
		>
			{m.home_surfaces_eyebrow()}
		</p>
		<h2
			id="surfaces-heading"
			class="mt-2 max-w-xl text-3xl font-semibold text-[var(--medora-ink)] sm:text-4xl"
		>
			{m.home_surfaces_heading()}
		</h2>
		<ul class="mt-12 grid gap-6 sm:grid-cols-2">
			{#each surfaces as s (s.title)}
				<li class="border-b border-[var(--medora-ink)]/10 pb-6">
					<h3 class="text-xl font-semibold text-[var(--medora-ink)]">
						{s.title}
					</h3>
					<p
						class="mt-2 max-w-md text-sm leading-relaxed text-[var(--medora-ink)]/70"
					>
						{s.body}
					</p>
				</li>
			{/each}
		</ul>
	</div>
</section>
