<script lang="ts">
	import { page } from '$app/state';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		getSubPages,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LVisitInfoBar from '$lib/component/own/local/private/heka/visit/LVisitInfoBar.svelte';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { toastError } from '$lib/util/toast-copy.util';
	import { untrack } from 'svelte';

	let { children } = $props();

	/** Paraglide `m` typings can lag behind `messages/*.json`; messages exist at runtime. */
	const msg = m as Record<string, (inputs?: object) => string>;

	const routerUtil = new RouterUtil();
	const toastService = new ToastService();
	const subPages = $derived(getSubPages());
	const currentPath = $derived(
		(pathnameForPageMatch() ?? '')
			.replace(/\/+$/, '')
			.replace(/\/+/g, '/') || '/'
	);
	const hospitalId = $derived(page.params.hospital_id);

	function pathMatches(pageUrl: string | null | undefined): boolean {
		if (pageUrl == null || pageUrl === '') return false;
		const u =
			(pageUrl ?? '')
				.replace(/\/+$/, '')
				.replace(/\/+/g, '/')
				.trim() || '/';
		return currentPath === u || currentPath.startsWith(u + '/');
	}

	function navUrl(pageUrl: string | null | undefined): string | null {
		if (!pageUrl || !hospitalId) return pageUrl ?? null;
		const base = hekaHospitalPageUrl(hospitalId, pageUrl);
		const vid = VisitState.visitId;
		return vid ? `${base}?visitId=${vid}` : base;
	}

	$effect(() => {
		const urlVisitId = page.url.searchParams.get('visitId') ?? '';
		if (
			urlVisitId &&
			urlVisitId !== untrack(() => VisitState.visitId)
		) {
			VisitState.visitId = urlVisitId;
		} else if (!urlVisitId && VisitState.visitId) {
			const vid = VisitState.visitId;
			untrack(() => {
				const search = new URLSearchParams(page.url.search);
				search.set('visitId', vid);
				const base = page.url.pathname;
				const url = `${base}?${search.toString()}`;
				routerUtil.replaceRoute(url);
			});
		}
	});

	const selectedVisitId = $derived(VisitState.visitId);
	const clinicalVisitReadOnly = $derived(
		VisitState.isClinicalVisitReadOnly
	);

	function getApiBase(): string {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		return `/api/heka/hospital/${hid}/home/observation/emr`;
	}

	async function apiPost<T>(mode: string, payload: Record<string, unknown>) {
		const res = await fetch(getApiBase(), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode, ...payload })
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function handleUnsignVisit() {
		const visitId = Number(VisitState.visitId ?? 0);
		if (!Number.isFinite(visitId) || visitId <= 0) return;

		const result = await dialogService.open({
			title: msg.clinical_visit_unsign_title(),
			message: msg.clinical_visit_unsign_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;

		try {
			await apiPost('visit.unsign', { visitId });
			VisitState.setClinicalSignedAtFromVisit(null);
			toastService.addToast(
				msg.clinical_visit_unsign_success(),
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			toastError(
				toastService,
				m.entity_visit(),
				m.toast_action_updated_failed(),
				err
			);
		}
	}

	function handleVisitSelected(data: {
		visitId: number;
		patientName: string;
	}) {
		VisitState.select(data);
		const search = new URLSearchParams(page.url.search);
		search.set('visitId', String(data.visitId));
		const base = page.url.pathname;
		const url =
			search.toString().length > 0
				? `${base}?${search.toString()}`
				: base;
		routerUtil.replaceRoute(url);
	}

	function handleVisitReset() {
		VisitState.reset();
		const search = new URLSearchParams(page.url.search);
		search.delete('visitId');
		const base = page.url.pathname;
		const url =
			search.toString().length > 0
				? `${base}?${search.toString()}`
				: base;
		routerUtil.replaceRoute(url);
	}
</script>

{#snippet signedBannerTrailing()}
	<button
		type="button"
		class="d-btn d-btn-ghost d-btn-sm d-btn-square min-h-8 min-w-8 border-0 text-current hover:bg-current/10"
		aria-label={msg.clinical_visit_unsign_x_aria()}
		onclick={handleUnsignVisit}
	>
		<LucideX className="size-4" />
	</button>
{/snippet}

{#if subPages.length > 0}
	<div class="emr-subnav-wrapper">
		<LVisitInfoBar
			visitId={selectedVisitId}
			{hospitalId}
			onVisitSelected={handleVisitSelected}
			onVisitReset={handleVisitReset}
		/>
		<div role="tablist" class="emr-subnav-tabs">
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
					{sub.name ?? m.untitled()}
				</button>
			{/each}
		</div>
		{#if clinicalVisitReadOnly}
			<DaisyUiAlert
				type={StatusColorEnum.WARNING}
				message={m.clinical_visit_signed_banner()}
				trailing={signedBannerTrailing}
				className="mb-2"
			/>
		{/if}
		<div
			class="emr-subnav-content"
			class:clinical-visit-locked={clinicalVisitReadOnly}
		>
			{@render children()}
		</div>
	</div>
{:else}
	<div class="emr-subnav-wrapper">
		<LVisitInfoBar
			visitId={selectedVisitId}
			{hospitalId}
			onVisitSelected={handleVisitSelected}
			onVisitReset={handleVisitReset}
		/>
		{#if clinicalVisitReadOnly}
			<DaisyUiAlert
				type={StatusColorEnum.WARNING}
				message={m.clinical_visit_signed_banner()}
				trailing={signedBannerTrailing}
				className="mb-2"
			/>
		{/if}
		<div
			class="emr-subnav-content"
			class:clinical-visit-locked={clinicalVisitReadOnly}
		>
			{@render children()}
		</div>
	</div>
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
	.emr-subnav-content {
		display: block;
		flex: 1;
		min-height: 0;
		padding: 0;
	}
</style>
