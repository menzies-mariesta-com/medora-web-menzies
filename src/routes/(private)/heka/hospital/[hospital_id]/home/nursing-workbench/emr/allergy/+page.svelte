<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import LPatientAllergyDialogContent from '$lib/component/local/private/heka/emr/LPatientAllergyDialogContent.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getPatientAllergiesByPatientIdWithRelations,
		deletePatientAllergies,
		type PatientAllergyWithRelations
	} from '$lib/remote/table/information-table/patient-allergies.remote';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';

	const visitIdStr = $derived(page.url.searchParams.get('visitId') ?? '');
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let visit = $state<{
		patientId: string;
		hospitalId: string;
	} | null>(null);
	let patientAllergies = $state<PatientAllergyWithRelations[]>([]);
	let isLoadingVisit = $state(false);
	let isLoadingAllergies = $state(false);
	const toastService = new ToastService();

	async function openAddDialog() {
		if (!visit?.patientId || !visitId) return;
		PatientAllergyDialogState.patientId = visit.patientId;
		PatientAllergyDialogState.visitId = visitId;
		PatientAllergyDialogState.patientAllergyId = null;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Add allergy to patient',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName: 'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.patientAllergyId = null;
				}
			});
			if (
				result?.confirmed &&
				result.data?.saved &&
				visit?.patientId &&
				visit?.hospitalId
			) {
				await fetchAllergies(visit.patientId, visit.hospitalId);
			}
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.patientAllergyId = null;
		}
	}

	async function openEditDialog(row: PatientAllergyWithRelations) {
		if (!visit?.patientId) return;
		PatientAllergyDialogState.patientId = visit.patientId;
		PatientAllergyDialogState.visitId = row.visitId;
		PatientAllergyDialogState.patientAllergyId = row.id;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Edit patient allergy',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName: 'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientAllergyId = null;
				}
			});
			if (
				result?.confirmed &&
				result.data?.saved &&
				visit?.patientId &&
				visit?.hospitalId
			) {
				await fetchAllergies(visit.patientId, visit.hospitalId);
			}
		} finally {
			PatientAllergyDialogState.patientAllergyId = null;
		}
	}

	async function handleDelete(row: PatientAllergyWithRelations) {
		const result = await dialogService.open({
			title: 'Remove allergy',
			message: `Remove "${row.allergy?.name ?? 'this allergy'}" from patient? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientAllergies({ id: row.id });
			toastService.addToast('Allergy removed.', StatusColorEnum.SUCCESS);
			if (visit?.patientId && visit?.hospitalId) {
				await fetchAllergies(visit.patientId, visit.hospitalId);
			}
		} catch (err) {
			toastService.addToast(
				(err instanceof Error ? err.message : 'Delete failed') as string,
				StatusColorEnum.ERROR
			);
		}
	}

	async function fetchVisit() {
		if (!visitId || !hospitalId) return;
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

	async function fetchAllergies(
		patientId: string,
		hospitalIdParam: string | undefined
	) {
		isLoadingAllergies = true;
		try {
			const data = await getPatientAllergiesByPatientIdWithRelations({
				patientId
			});
			// Scope to this hospital (all visits) like Vital page
			patientAllergies = hospitalIdParam
				? data.filter((row) => row.visit?.hospitalId === hospitalIdParam)
				: data;
		} finally {
			isLoadingAllergies = false;
		}
	}

	$effect(() => {
		const vid = visitId;
		if (vid) {
			fetchVisit().then(() => {
				if (visit?.patientId && visit?.hospitalId) {
					fetchAllergies(visit.patientId, visit.hospitalId);
				}
			});
		} else {
			visit = null;
			patientAllergies = [];
		}
	});

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	const allergyColumns: MariTableColumn<PatientAllergyWithRelations>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (_value, row) => row.visit?.visitNo?.trim() ?? '–'
		},
		{
			id: 'allergyName',
			header: 'Allergy',
			widthClass: 'min-w-[10rem]',
			filterable: false,
			format: (_value, row) => formatText(row.allergy?.name ?? null)
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		},
		{
			id: 'severity',
			header: 'Severity',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			format: (_value, row) => formatText(row.severity?.name ?? null)
		},
		{
			id: 'reaction',
			header: 'Reaction',
			widthClass: 'min-w-32',
			filterable: false,
			format: (_value, row) => formatText(row.reaction),
			cellClass: 'max-w-48 truncate'
		},
		{
			id: 'remark',
			header: 'Remark',
			widthClass: 'min-w-32',
			filterable: false,
			format: (_value, row) => formatText(row.remark),
			cellClass: 'max-w-48 truncate'
		}
	];
</script>

<svelte:head>
	<title>Allergy</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<p class="text-sm text-base-content/70">
			Add and view patient allergies across all visits.
		</p>
	</div>

	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message='Choose a visit using the "Choose Visit" button above to add or view allergies.'
			className="z-0"
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
				<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
					<DaisyUiCardBodyTitle className="mb-0">
						Patient allergies (all visits)
					</DaisyUiCardBodyTitle>
					<DaisyUiButton
						className="d-btn-primary d-btn-sm gap-1.5"
						onClick={openAddDialog}
					>
						<LucidePlus className="size-4 shrink-0" />
						Add allergy
					</DaisyUiButton>
				</div>
				{#if isLoadingAllergies}
					<div class="flex min-h-32 items-center justify-center">
						<DaisyUiLoading className="d-loading-lg" />
					</div>
				{:else if patientAllergies.length === 0}
					<p class="text-sm text-base-content/70">
						No allergies recorded for this patient yet.
					</p>
				{:else}
					<div class="flex flex-col gap-3 {TableEnum.HEIGHT}">
						<MariTable
							rows={patientAllergies}
							columns={allergyColumns}
							isLoading={isLoadingAllergies}
							showRefreshButton={false}
							emptyMessage="No allergies."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={false}
						>
							<svelte:fragment slot="rowActions" let:row>
								<td class="w-24 shrink-0 text-right">
									<div class="flex justify-end gap-1">
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={() => openEditDialog(row)}
										>
											<LucidePencil className="size-4" />
										</DaisyUiButton>
										<DaisyUiButton
											className="d-btn-ghost d-btn-error d-btn-sm"
											onClick={() => handleDelete(row)}
										>
											<LucideTrash2 className="size-4" />
										</DaisyUiButton>
									</div>
								</td>
							</svelte:fragment>
						</MariTable>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
