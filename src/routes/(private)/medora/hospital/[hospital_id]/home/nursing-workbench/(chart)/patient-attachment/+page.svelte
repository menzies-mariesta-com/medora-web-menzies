<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import LPatientAttachmentDialogContent from '$lib/component/own/local/private/medora/patient/attachment/LPatientAttachmentDialogContent.svelte';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import {
		isSupersededVisitFetch,
		shouldCommitNursingChartVisitLoad,
		type NursingChartVisitLoadOutcome
	} from '$lib/util/nursing-chart-visit-load.util';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(parseUuid(visitIdStr) ?? '');
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
	} | null>(null);
	let isLoadingVisit = $state(false);
	let lastLoadedVisitId = '';
	let mounted = $state(false);
	const lifeCycleUtil = new LifeCycleUtil();

	lifeCycleUtil.onMount(() => {
		mounted = true;
	});
	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	function apiBase(): string {
		return hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/patient-attachment`
			: '';
	}

	async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
		const res = await fetch(url, { signal });
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(text || res.statusText);
		}
		return (await res.json()) as T;
	}

	async function fetchVisit(opts?: {
		signal?: AbortSignal;
		isCancelled?: () => boolean;
	}): Promise<NursingChartVisitLoadOutcome> {
		if (!visitId || !hospitalId) return 'error';
		isLoadingVisit = true;
		try {
			const base = apiBase();
			if (!base) return 'error';
			const res = await apiGet<{
				data: { patientId: string; hospitalId: string } | null;
			}>(`${base}?action=visitBasics&visitId=${visitId}`, opts?.signal);
			if (opts?.isCancelled?.()) return 'aborted';
			if (!res.data) {
				visit = null;
				return 'not_found';
			}
			visit = res.data;
			return 'ok';
		} catch (err) {
			if (isSupersededVisitFetch(err, opts?.isCancelled)) return 'aborted';
			visit = null;
			return 'error';
		} finally {
			if (!opts?.isCancelled?.()) isLoadingVisit = false;
		}
	}

	$effect(() => {
		if (!mounted) return;
		if (visitId) {
			if (visitId === lastLoadedVisitId) return;
			let cancelled = false;
			const ac = new AbortController();
			void (async () => {
				const outcome = await fetchVisit({
					signal: ac.signal,
					isCancelled: () => cancelled
				});
				if (
					!cancelled &&
					shouldCommitNursingChartVisitLoad(outcome)
				) {
					lastLoadedVisitId = visitId;
				}
			})();
			return () => {
				cancelled = true;
				ac.abort();
			};
		} else {
			lastLoadedVisitId = '';
			visit = null;
		}
	});

	$effect(() => {
		if (visit?.patientId) {
			PatientAttachmentDialogState.viewOnly = false;
			PatientAttachmentDialogState.stagedAttachments = [];
			PatientAttachmentDialogState.pending = {
				patientId: visit.patientId,
				hospitalId: visit.hospitalId
			};
		} else {
			PatientAttachmentDialogState.pending = null;
			PatientAttachmentDialogState.viewOnly = false;
			PatientAttachmentDialogState.stagedAttachments = [];
		}
	});
</script>

<svelte:head>
	<title>Patient attachments</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message="Choose a visit using the=&quot;Choose Visit&quot; bar above to manage patient attachments."
		/>
	{:else if !visit && !isLoadingVisit}
		<WashAlert
			type={StatusColorEnum.WARNING}
			message="Visit not found."
		/>
	{:else}
		<WashCard>
			<WashCardBody className="m-0 p-1">
				{#if !visit}
					<div
						class="flex min-h-32 items-center justify-center gap-2 text-sm text-base-content/70"
					>
						<span class="loading loading-spinner loading-md"></span>
						Loading visit…
					</div>
				{:else}
					<div class="flex flex-col">
						<LPatientAttachmentDialogContent
							cancel={() => {}}
							confirm={() => {}}
							embedded={true}
						/>
					</div>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}
</div>
