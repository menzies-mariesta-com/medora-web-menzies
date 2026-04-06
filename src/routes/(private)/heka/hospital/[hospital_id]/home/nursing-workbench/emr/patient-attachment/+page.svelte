<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import LPatientAttachmentDialogContent from '$lib/component/own/local/private/heka/patient/attachment/LPatientAttachmentDialogContent.svelte';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import { getPatientVisitById } from '$lib/tool/remote/table/information-table/patient-visit.http.tool.svelte';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
	} | null>(null);
	let isLoadingVisit = $state(false);
	let lastLoadedVisitId = $state<number | null>(null);

	async function fetchVisit() {
		if (!visitId) {
			visit = null;
			return;
		}
		isLoadingVisit = true;
		try {
			const v = await getPatientVisitById({ id: visitId });
			if (v) {
				visit = {
					patientId: v.patientId,
					hospitalId: v.hospitalId
				};
			} else {
				visit = null;
			}
		} finally {
			isLoadingVisit = false;
		}
	}

	$effect(() => {
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
				patientId: visit.patientId
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
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" bar above to manage patient attachments.'}
		/>
	{:else if !visit && !isLoadingVisit}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message="Visit not found."
		/>
	{:else}
		<DaisyUiCard>
			<DaisyUiCardBody className="m-0 p-1">
				{#if !visit}
					<div class="flex min-h-32 items-center justify-center gap-2 text-sm text-base-content/70">
						<DaisyUiLoading className="d-loading-md" />
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
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
