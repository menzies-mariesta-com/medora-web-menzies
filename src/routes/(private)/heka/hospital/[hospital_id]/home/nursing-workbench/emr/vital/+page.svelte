<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiDivider from '$lib/component/library/daisyui/divider/DaisyUiDivider.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { VitalRecordDialogState } from '$lib/state/vital-record-dialog.state.svelte';
	import LVitalRecordDialogContent from '$lib/component/local/private/heka/emr/LVitalRecordDialogContent.svelte';
	import DaisyUiCollapseTitle from '$lib/component/library/daisyui/collapse/title/DaisyUiCollapseTitle.svelte';
	import DaisyUiCollapseContent from '$lib/component/library/daisyui/collapse/content/DaisyUiCollapseContent.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { getPatientVisitById } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getPatientVitalsByPatientId,
		deletePatientVital,
		type PatientVitalWithVisit
	} from '$lib/remote/table/information-table/patient-vital.remote';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import { vitalTextClass } from '$lib/config/vital.config';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

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
	let vitals = $state<PatientVitalWithVisit[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoadingVisit = $state(false);
	let isLoadingVitals = $state(false);
	const toastService = new ToastService();

	async function openRecordDialog() {
		if (!visit?.patientId || !visit?.hospitalId || !visitId) return;
		VitalRecordDialogState.patientId = visit.patientId;
		VitalRecordDialogState.hospitalId = visit.hospitalId;
		VitalRecordDialogState.visitId = visitId;
		VitalRecordDialogState.vitalId = null;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Record new vitals',
				component: LVitalRecordDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					VitalRecordDialogState.patientId = null;
					VitalRecordDialogState.hospitalId = null;
					VitalRecordDialogState.visitId = null;
					VitalRecordDialogState.vitalId = null;
				}
			});
			if (
				result?.confirmed &&
				result.data?.saved &&
				visit?.patientId &&
				visit?.hospitalId
			) {
				await fetchVitals(visit.patientId, visit.hospitalId);
			}
		} finally {
			VitalRecordDialogState.patientId = null;
			VitalRecordDialogState.hospitalId = null;
			VitalRecordDialogState.visitId = null;
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function openEditDialog(v: PatientVitalWithVisit) {
		if (!v.patientId || !v.hospitalId || !v.visitId) return;
		VitalRecordDialogState.patientId = v.patientId;
		VitalRecordDialogState.hospitalId = v.hospitalId;
		VitalRecordDialogState.visitId = v.visitId;
		VitalRecordDialogState.vitalId = v.id;
		try {
			const result = await dialogService.open<{ saved?: boolean }>({
				title: 'Edit vitals',
				component: LVitalRecordDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					VitalRecordDialogState.vitalId = null;
				}
			});
			if (
				result?.confirmed &&
				result.data?.saved &&
				visit?.patientId &&
				visit?.hospitalId
			) {
				await fetchVitals(visit.patientId, visit.hospitalId);
			}
		} finally {
			VitalRecordDialogState.vitalId = null;
		}
	}

	async function handleDeleteVital(v: PatientVitalWithVisit) {
		const result = await dialogService.open({
			title: 'Delete vital',
			message: `Delete vital record from ${formatDateTime(getVitalDisplayDate(v) ?? null)}? This cannot be undone.`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deletePatientVital({ id: v.id });
			toastService.addToast(
				'Vital deleted.',
				StatusColorEnum.SUCCESS
			);
			if (visit?.patientId && visit?.hospitalId) {
				await fetchVitals(visit.patientId, visit.hospitalId);
			}
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Delete failed') as string,
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

	async function fetchVitals(
		patientId: string,
		hospitalIdParam: string
	) {
		isLoadingVitals = true;
		try {
			vitals = await getPatientVitalsByPatientId({
				patientId,
				hospitalId: hospitalIdParam
			});
		} finally {
			isLoadingVitals = false;
		}
	}

	$effect(() => {
		const vid = visitId;
		if (vid) {
			fetchVisit().then(() => {
				if (visit?.patientId && visit?.hospitalId) {
					fetchVitals(visit.patientId, visit.hospitalId);
				}
			});
		} else {
			visit = null;
			vitals = [];
		}
	});

	function formatVital(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '–';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '–';
		}
	}

	/** Prefer vitalDateTime (when vital was taken) over createdAt (when record was saved). */
	function getVitalDisplayDate(
		v: PatientVitalWithVisit
	): string | null | undefined {
		return v.vitalDateTime ?? v.createdAt;
	}

	const vitalColumns: MariTableColumn<PatientVitalWithVisit>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-40',
			filterable: true,
			format: (_value, row) => row.visit?.visitNo?.trim() || '–'
		},
		{
			id: 'date',
			header: 'Date',
			widthClass: 'w-36 min-w-[9rem] whitespace-nowrap',
			filterable: false,
			format: (_value, row) =>
				formatDateTime(getVitalDisplayDate(row) ?? null)
		},
		{
			id: 'height',
			header: 'Height (cm)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.height)
		},
		{
			id: 'weight',
			header: 'Weight (kg)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.weight)
		},
		{
			id: 'bp',
			header: 'BP (mmHg)',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) =>
				`${formatVital(row.bpSystolic)}/${formatVital(
					row.bpDiastolic
				)}`,
			cellClassGetter: (row) =>
				vitalTextClass(row.bpSystolic, 'bpSystolic') ||
				vitalTextClass(row.bpDiastolic, 'bpDiastolic')
		},
		{
			id: 'pulse',
			header: 'P (bpm)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.pulse),
			cellClassGetter: (row) => vitalTextClass(row.pulse, 'pulse')
		},
		{
			id: 'temperature',
			header: 'T (°C)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.temperature),
			cellClassGetter: (row) =>
				vitalTextClass(row.temperature, 'temperature')
		},
		{
			id: 'spO2',
			header: 'SpO₂ (%)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.spO2),
			cellClassGetter: (row) => vitalTextClass(row.spO2, 'spO2')
		},
		{
			id: 'respiration',
			header: 'R (/min)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.respiration),
			cellClassGetter: (row) =>
				vitalTextClass(row.respiration, 'respiration')
		},
		{
			id: 'rbs',
			header: 'RBS (mg/dL)',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.rbs),
			cellClassGetter: (row) => vitalTextClass(row.rbs, 'rbs')
		},
		{
			id: 'symptom',
			header: 'Symptom',
			widthClass: 'min-w-32',
			filterable: false,
			format: (_value, row) => formatVital(row.symptom),
			cellClass: 'max-w-48 truncate'
		}
	];
</script>

<svelte:head>
	<title>Vital</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Choose a visit using the "Choose Visit" button above to record vitals.'}
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
			<DaisyUiCardBody className="p-3 m-0 ">
				<div
					class="mb-2 flex flex-wrap items-center justify-between gap-3"
				>
					<DaisyUiCardBodyTitle className="mb-0">
						Patient vitals (all visits)
					</DaisyUiCardBodyTitle>
					<DaisyUiButton
						className="d-btn-primary d-btn-sm gap-1.5"
						onClick={openRecordDialog}
					>
						<LucidePlus className="size-4 shrink-0" />
						Record new vitals
					</DaisyUiButton>
				</div>
				{#if isLoadingVitals}
					<div class="flex min-h-32 items-center justify-center">
						<DaisyUiLoading className="d-loading-lg" />
					</div>
				{:else if vitals.length === 0}
					<p class="text-sm text-base-content/70">
						No vitals recorded for this patient yet.
					</p>
				{:else}
					<div class="flex flex-col gap-3 {TableEnum.HEIGHT}">
						<MariTable
							rows={vitals}
							columns={vitalColumns}
							isLoading={isLoadingVitals}
							bind:pageSize={pageSizeStr}
							bind:currentPage
							showRefreshButton={false}
							emptyMessage="No vitals."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={true}
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
											onClick={() => handleDeleteVital(row)}
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
