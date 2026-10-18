<script lang="ts">
	import LucideCalendar from '$lib/component/own/library/lucide/LucideCalendar.svelte';
	import LucideStethoscope from '$lib/component/own/library/lucide/LucideStethoscope.svelte';
	import LucideUsersRound from '$lib/component/own/library/lucide/LucideUsersRound.svelte';
	import LucideExternalLink from '$lib/component/own/library/lucide/LucideLink.svelte';
	import type { MenziesEcosystemProductId } from '$lib/model/type/menzies-ecosystem.type';
	import { getMenziesEcosystemProductsPlaceholder } from '$lib/tool/menzies-ecosystem.placeholder';
	import { paraglideMsg } from '$lib/util/paraglide-fallback.util';

	const products = $derived(getMenziesEcosystemProductsPlaceholder());

	function productTitle(id: MenziesEcosystemProductId): string {
		switch (id) {
			case 'nextup':
				return paraglideMsg(
					'ecosystem_nextup_title',
					'NextUp By Menzies'
				);
			case 'medora_patients':
				return paraglideMsg(
					'ecosystem_medora_patients_title',
					'Medora Patients By Menzies'
				);
			case 'medora_doctors':
				return paraglideMsg(
					'ecosystem_medora_doctors_title',
					'Medora Doctors By Menzies'
				);
			default:
				return id;
		}
	}

	function productBlurb(id: MenziesEcosystemProductId): string {
		switch (id) {
			case 'nextup':
				return paraglideMsg(
					'ecosystem_nextup_blurb',
					'Staff scheduling and shift planning across your group.'
				);
			case 'medora_patients':
				return paraglideMsg(
					'ecosystem_medora_patients_blurb',
					'Patient portal and engagement for your hospitals.'
				);
			case 'medora_doctors':
				return paraglideMsg(
					'ecosystem_medora_doctors_blurb',
					'Physician workspace and mobile rounds companion.'
				);
			default:
				return '';
		}
	}
</script>

{#snippet productIcon(id: MenziesEcosystemProductId)}
	{#if id === 'nextup'}
		<LucideCalendar className="size-8" aria-hidden="true" />
	{:else if id === 'medora_patients'}
		<LucideUsersRound className="size-8" aria-hidden="true" />
	{:else}
		<LucideStethoscope className="size-8" aria-hidden="true" />
	{/if}
{/snippet}

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-2 sm:p-4">
	<header class="flex flex-col gap-2">
		<h1 class="card-title text-primary font-bold text-xl sm:text-2xl">
			{paraglideMsg('ecosystem_page_title', 'Menzies ecosystem')}
		</h1>
		<p class="text-base-content/80 text-sm sm:text-base max-w-2xl">
			{paraglideMsg(
				'ecosystem_page_blurb',
				'Apps your organization can add alongside Medora. Subscribed products open in a new tab when integration is enabled.'
			)}
		</p>
	</header>

	<ul
		class="grid list-none gap-4 p-0 m-0 sm:grid-cols-2 lg:grid-cols-3"
		role="list"
	>
		{#each products as product (product.id)}
			<li class="min-w-0">
				{#if product.purchased && product.externalUrl}
					<a
						href={product.externalUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="card card-border bg-base-100 hover:border-primary/50 hover:bg-primary/5 flex h-full cursor-pointer flex-col gap-3 p-4 shadow-sm transition-colors"
					>
						<div
							class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"
						>
							{@render productIcon(product.id)}
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<h2 class="font-semibold text-base leading-snug">
								{productTitle(product.id)}
							</h2>
							<p class="text-base-content/70 text-sm">
								{productBlurb(product.id)}
							</p>
						</div>
						<span
							class="btn btn-accent btn-sm mt-auto w-full cursor-pointer gap-2"
						>
							{paraglideMsg('ecosystem_open_app', 'Open app')}
							<LucideExternalLink
								className="size-4"
								aria-hidden="true"
							/>
						</span>
					</a>
				{:else}
					<article
						class="card card-border bg-base-200/40 flex h-full flex-col gap-3 p-4 opacity-95"
						aria-disabled="true"
					>
						<div
							class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-base-300 text-base-content/60"
						>
							{@render productIcon(product.id)}
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<h2 class="font-semibold text-base leading-snug">
								{productTitle(product.id)}
							</h2>
							<p class="text-base-content/70 text-sm">
								{productBlurb(product.id)}
							</p>
						</div>
						<span
							class="badge badge-outline badge-neutral mt-auto w-fit"
						>
							{paraglideMsg(
								'ecosystem_not_subscribed',
								'Not on your plan'
							)}
						</span>
					</article>
				{/if}
			</li>
		{/each}
	</ul>
</div>
