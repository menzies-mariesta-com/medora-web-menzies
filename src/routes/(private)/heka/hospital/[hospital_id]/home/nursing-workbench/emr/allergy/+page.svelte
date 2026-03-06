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
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';

	const dateTimeUtil = new DateTimeUtil();
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
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoadingVisit = $state(false);
	let isLoadingAllergies = $state(false);
	const toastService = new ToastService();

	async function openAddDialog() {
		if (!visit?.patientId || !visitId) return;
		const patientId = visit.patientId;
		const hospitalIdParam = visit.hospitalId;
		PatientAllergyDialogState.patientId = patientId;
		PatientAllergyDialogState.visitId = visitId;
		PatientAllergyDialogState.patientAllergyId = null;
		PatientAllergyDialogState.onSaved = () => fetchAllergies(patientId, hospitalIdParam);
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Add allergy to patient',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName: 'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) {
						fetchAllergies(patientId, hospitalIdParam);
					}
				}
			});
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function openEditDialog(row: PatientAllergyWithRelations) {
		if (!visit?.patientId) return;
		const patientId = visit.patientId;
		const hospitalIdParam = visit.hospitalId;
		PatientAllergyDialogState.patientId = patientId;
		PatientAllergyDialogState.visitId = row.visitId;
		PatientAllergyDialogState.patientAllergyId = row.id;
		PatientAllergyDialogState.onSaved = () => fetchAllergies(patientId, hospitalIdParam);
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Edit patient allergy',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName: 'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) {
						fetchAllergies(patientId, hospitalIdParam);
					}
				}
			});
		} finally {
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.onSaved = null;
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

	function formatDateTime(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		const date = dateTimeUtil.parseDate(value);
		return date
			? dateTimeUtil.formatDateTime(date, 'en-US', {
					dateStyle: 'short',
					timeStyle: 'short'
				})
			: '–';
	}

	const allergyColumns: MariTableColumn<PatientAllergyWithRelations>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-40',
			filterable: false,
			format: (_value, row) => row.visit?.visitNo?.trim() ?? '–'
		},
		{
			id: 'allergyName',
			header: 'Allergy',
			widthClass: 'min-w-[8rem]',
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
		},
		{
			id: 'deactivationRemark',
			header: 'Deactivation remark',
			widthClass: 'min-w-32',
			filterable: false,
			format: (_value, row) => formatText(row.deactivationRemark),
			cellClass: 'max-w-48 truncate'
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			format: (_value, row) => formatDateTime(row.createdAt ?? null)
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			format: (_value, row) => formatDateTime(row.updatedAt ?? null)
		}
	];
</script>

<svelte:head>
	<title>Allergy</title>
</svelte:head>

<div class="flex flex-col gap-4">
	
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
							bind:pageSize={pageSizeStr}
							bind:currentPage={currentPage}
							showRefreshButton={true}
							emptyMessage="No allergies."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={false}
							on:refresh={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchAllergies(visit.patientId, visit.hospitalId);
								}
							}}
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
