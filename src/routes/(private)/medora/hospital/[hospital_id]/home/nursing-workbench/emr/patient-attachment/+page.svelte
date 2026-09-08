<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import LPatientAttachmentDialogContent from '$lib/component/own/local/private/medora/patient/attachment/LPatientAttachmentDialogContent.svelte';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
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
	let lastLoadedVisitId = $state<number | null>(null);
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

	async function apiGet<T>(url: string): Promise<T> {
		const res = await fetch(url);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(text || res.statusText);
		}
		return (await res.json()) as T;
	}

	async function fetchVisit() {
		if (!visitId || !hospitalId) {
			visit = null;
			return;
		}
		isLoadingVisit = true;
		try {
			const base = apiBase();
			if (!base) return;
			const res = await apiGet<{
				data: { patientId: string; hospitalId: string } | null;
			}>(`${base}?action=visitBasics&visitId=${visitId}`);
			visit = res.data;
		} finally {
			isLoadingVisit = false;
		}
	}

	$effect(() => {
		if (!mounted) return;
		if (visitId) {
			if (visitId === lastLoadedVisitId) return;
			lastLoadedVisitId = visitId;
			fetchVisit();
		} else {
			lastLoadedVisitId = null;
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
			message={'Choose a visit using the="Choose Visit" bar above to manage patient attachments.'}
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
