<script lang="ts">
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { pathnameForPageMatch } from '$lib/state/page.state.svelte';
	import { getEdAdmissionSubPages } from '$lib/tool/medora/ed-admission-subnav.util';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(
		getEdAdmissionSubPages({
			erRegistration: m.ed_admission_new_title(),
			newPatient: msg.ed_admission_tab_new_patient?.() ?? 'New patient',
			list:
				msg.ed_admission_tab_registration_list?.() ??
				'Registration list'
		})
	);
	const currentPath = $derived(
		pathnameForPageMatch().replace(/\/$/, '') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		const u = (pageUrl ?? '').replace(/\/$/, '') || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}

	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		return medoraHospitalPageUrl(hospitalId, pageUrl);
	}
</script>

{#if subPages.length > 0}
	<div class="ed-subnav-wrapper">
		<div role="tablist" class="ed-subnav-tabs">
			{#each subPages as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="ed-subnav-tab cursor-pointer"
					class:active={pathMatches(sub.pageUrl)}
					onclick={() => {
						const url = navUrl(sub.pageUrl);
						if (url) routerUtil.replaceRoute(url);
					}}
				>
					{sub.name ?? m.untitled()}
				</button>
			{/each}
		</div>
		<div class="ed-subnav-content">
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.ed-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.ed-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.ed-subnav-tab {
		appearance: none;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.5rem 1rem;
		margin-bottom: -1px;
		font: inherit;
		color: inherit;
		opacity: 0.7;
	}
	.ed-subnav-tab:hover {
		opacity: 1;
	}
	.ed-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.ed-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
