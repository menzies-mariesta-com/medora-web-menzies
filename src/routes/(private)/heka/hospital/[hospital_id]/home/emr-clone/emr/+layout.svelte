<script lang="ts">
	import { page } from '$app/state';
	import { hekaHospitalPageUrl, WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { getSubPages, pathnameForPageMatch } from '$lib/state/page.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import LPatientListDialogContent from '$lib/component/local/private/heka/emr/LPatientListDialogContent.svelte';

	let { children } = $props();

	const routerUtil = new RouterUtil();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(pathnameForPageMatch().replace(/\/$/, '') || '/');
	const hospitalId = $derived(page.params.hospital_id);
	const currentSearch = $derived(page.url.search);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		const u = (pageUrl ?? '').replace(/\/$/, '') || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}

	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		const base = hekaHospitalPageUrl(hospitalId, pageUrl);
		return currentSearch ? `${base}${currentSearch}` : base;
	}

	const selectedVisitId = $derived(page.url.searchParams.get('visitId') ?? '');
	const selectedPatientName = $derived(page.url.searchParams.get('patientName') ?? '');
	const selectedVisitLabel = $derived(
		selectedVisitId
			? `Visit ${selectedVisitId} – ${selectedPatientName || 'Unknown patient'}`
			: 'No visit selected'
	);

	async function handleChoosePatient() {
		if (!hospitalId) return;
		const result = await dialogService.open<{
			visitId: number;
			patientName: string;
		}>({
			title: 'Choose visit',
			component: LPatientListDialogContent,
			fullScreen: true
		});
		if (result?.confirmed && result.data) {
			const search = new URLSearchParams(page.url.search);
			search.set('visitId', String(result.data.visitId));
			search.set('patientName', result.data.patientName);
			const base = page.url.pathname;
			const url =
				search.toString().length > 0 ? `${base}?${search.toString()}` : base;
			routerUtil.replaceRoute(url);
		}
	}
</script>

{#if subPages.length > 0}
	<div class="emr-subnav-wrapper">
		<div class="emr-patient-bar">
			<div class="emr-patient-bar-left">
				<div class="emr-patient-bar-title">Selected Visit</div>
				<div class="emr-patient-bar-value">{selectedVisitLabel}</div>
			</div>
			<div class="emr-patient-bar-right">
				<button
					type="button"
					class="emr-patient-bar-button"
					onclick={handleChoosePatient}
				>
					Choose Visit
				</button>
			</div>
		</div>
		<nav role="tablist" class="emr-subnav-tabs">
			{#each subPages as sub (sub.id)}
				<button
					type="button"
					role="tab"
					class="emr-subnav-tab"
					class:active={pathMatches(sub.pageUrl)}
					onclick={() => {
						const url = navUrl(sub.pageUrl);
						if (url) routerUtil.replaceRoute(url);
					}}
				>
					{sub.name ?? 'Untitled'}
				</button>
			{/each}
		</nav>
		<div class="emr-subnav-content">
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.emr-subnav-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 0;
	}
	.emr-subnav-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		padding-bottom: 0;
		margin-bottom: 1rem;
	}
	.emr-subnav-tab {
		appearance: none;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.5rem 1rem;
		margin-bottom: -1px;
		font: inherit;
		color: inherit;
		cursor: pointer;
		opacity: 0.7;
	}
	.emr-subnav-tab:hover {
		opacity: 1;
	}
	.emr-subnav-tab.active {
		opacity: 1;
		border-bottom-color: var(--color-primary, #570df8);
		font-weight: 600;
	}
	.emr-patient-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--color-base-300, #d1d5db);
		border-bottom: 1px solid var(--color-base-300, #d1d5db);
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}
	.emr-patient-bar-left {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.emr-patient-bar-title {
		font-weight: 600;
	}
	.emr-patient-bar-value {
		color: var(--color-base-400, #9ca3af);
	}
	.emr-patient-bar-right {
		display: flex;
		align-items: center;
	}
	.emr-patient-bar-button {
		appearance: none;
		border-radius: 0.25rem;
		border: 1px solid var(--color-primary, #570df8);
		background: var(--color-primary, #570df8);
		color: white;
		padding: 0.35rem 0.9rem;
		font: inherit;
		cursor: pointer;
	}
	.emr-patient-bar-button:hover {
		filter: brightness(1.05);
	}
	.emr-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
