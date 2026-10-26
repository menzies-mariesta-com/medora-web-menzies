<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const currentPath = $derived(
		page.url.pathname.replace(/\/$/, '') || '/'
	);
	const tabs = $derived([
		{
			label: 'OT Patient Registration',
			href: `/medora/hospital/${hospitalId}/home/operation-theatre/registration/ot-patient`
		},
		{
			label: 'New Patient',
			href: `/medora/hospital/${hospitalId}/home/operation-theatre/registration/new-patient`
		},
		{
			label: 'Registration List',
			href: `/medora/hospital/${hospitalId}/home/operation-theatre/registration/list`
		}
	]);
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div
		role="tablist"
		class="flex flex-wrap gap-1 border-b border-base-300 px-4 pt-3"
	>
		{#each tabs as tab (tab.href)}
			{@const active =
				currentPath === tab.href ||
				currentPath.startsWith(tab.href + '/')}
			<a
				role="tab"
				aria-selected={active}
				href={resolve(tab.href as never)}
				class="tab tab-bordered cursor-pointer"
				class:tab-active={active}
			>
				{tab.label}
			</a>
		{/each}
	</div>
	<div class="flex min-h-0 flex-1 flex-col">
		{@render children()}
	</div>
</div>
