<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import LPatientAttachmentDialogContent from '$lib/component/local/private/heka/patient/attachment/LPatientAttachmentDialogContent.svelte';
	import { PatientAttachmentDialogState } from '$lib/state/patient-attachment.dialog.state.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
	} | null>(null);
	let isLoadingVisit = $state(false);

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
		const id = visitId;
		if (id) {
			fetchVisit();
		} else {
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
	<p class="text-sm text-base-content/70">
		Manage files and documents linked to the patient. Attachments are
		stored per patient, not per visit.
	</p>

	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message="Choose a visit using the "Choose Visit" bar above to manage patient attachments."
		/>
	{:else if isLoadingVisit}
		<div class="flex min-h-32 items-center justify-center">
			<DaisyUiLoading className="d-loading-lg" />
		</div>
	{:else if !visit}
		<DaisyUiAlert
			type={StatusColorEnum.WARNING}
			message="Visit not found."
		/>
	{:else}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<div class="flex flex-col">
					<LPatientAttachmentDialogContent
						cancel={() => {}}
						embedded={true}
					/>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
