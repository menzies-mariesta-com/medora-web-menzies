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
		getPatientVitalsByPatientIdPaginated,
		deletePatientVital,
		type PatientVitalWithVisit
	} from '$lib/remote/table/information-table/patient-vital.remote';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import {
		vitalTextClass,
		type VitalKey
	} from '$lib/config/vital.config';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
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
	let vitals = $state<PatientVitalWithVisit[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoadingVisit = $state(false);
	let isLoadingVitals = $state(false);
	let totalVitals = $state(0);
	let tableFilters = $state<Record<string, string>>({
		status: String(StatusEnum.ACTIVE)
	});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastLoadedVisitKey = $state('');
	let lastHandledPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let lastVitalsFetchKey = $state('');
	let mounted = $state(false);
	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	lifeCycleUtil.onMount(() => {
		mounted = true;
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});

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
				await fetchVitals(visit.patientId, visit.hospitalId, {
					force: true
				});
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
				await fetchVitals(visit.patientId, visit.hospitalId, {
					force: true
				});
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
				await fetchVitals(visit.patientId, visit.hospitalId, {
					force: true
				});
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

	async function fetchVisit(): Promise<{
		patientId: string;
		hospitalId: string;
	} | null> {
		if (!visitId || !hospitalId) return null;
		isLoadingVisit = true;
		try {
			const v = await getPatientVisitById({ id: visitId });
			if (v) {
				const nextVisit = {
					patientId: v.patientId,
					hospitalId: v.hospitalId
				};
				visit = nextVisit;
				return nextVisit;
			} else {
				visit = null;
				return null;
			}
		} catch {
			visit = null;
			return null;
		} finally {
			isLoadingVisit = false;
		}
	}

	async function fetchVitals(
		patientId: string,
		hospitalIdParam: string,
		options?: { force?: boolean }
	) {
		const pageSize = Number(pageSizeStr) || 10;
		const requestKey = JSON.stringify({
			patientId,
			hospitalIdParam,
			page: currentPage,
			pageSize,
			visitNo: tableFilters.visitNo?.trim() || '',
			status: tableFilters.status ?? ''
		});
		if (!options?.force && requestKey === lastVitalsFetchKey) {
			return;
		}
		lastVitalsFetchKey = requestKey;
		isLoadingVitals = true;
		console.log('FETCHING VITALS');
		try {
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const result = await getPatientVitalsByPatientIdPaginated({
				patientId,
				hospitalId: hospitalIdParam,
				page: currentPage,
				pageSize,
				visitNo: tableFilters.visitNo?.trim() || undefined,
				statusId:
					statusId != null && Number.isFinite(statusId)
						? statusId
						: undefined
			});
			vitals = result.data;
			totalVitals = result.total;
		} catch {
			vitals = await getPatientVitalsByPatientId({
				patientId,
				hospitalId: hospitalIdParam
			});
			totalVitals = vitals.length;
		} finally {
			isLoadingVitals = false;
		}
	}

	$effect(() => {
		if (!mounted) return;

		if (visitId && hospitalId) {
			const visitKey = `${visitId}:${hospitalId}`;
			if (lastLoadedVisitKey === visitKey) {
				return;
			}
			lastLoadedVisitKey = visitKey;
			(async () => {
				const resolvedVisit = await fetchVisit();
				if (resolvedVisit) {
					await fetchVitals(
						resolvedVisit.patientId,
						resolvedVisit.hospitalId
					);
				}
			})();
		} else {
			lastLoadedVisitKey = '';
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

	const statusFilterOptions = [
		{ label: 'Active', value: String(StatusEnum.ACTIVE) },
		{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
	];

	const vitalColumns: MariTableColumn<PatientVitalWithVisit>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-40',
			filterable: true,
			format: (_value, row) => row.visit?.visitNo?.trim() || '–'
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: statusFilterOptions,
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: `Status ${row.statusId ?? 'Unknown'}`
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
				vitalTextClass(row.bpSystolic, 'bpSystolic' as VitalKey) ||
				vitalTextClass(row.bpDiastolic, 'bpDiastolic' as VitalKey)
		},
		{
			id: 'pulse',
			header: 'P (bpm)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.pulse),
			cellClassGetter: (row) =>
				vitalTextClass(row.pulse, 'pulse' as VitalKey)
		},
		{
			id: 'temperature',
			header: 'T (°C)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.temperature),
			cellClassGetter: (row) =>
				vitalTextClass(row.temperature, 'temperature' as VitalKey)
		},
		{
			id: 'spO2',
			header: 'SpO₂ (%)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.spO2),
			cellClassGetter: (row) =>
				vitalTextClass(row.spO2, 'spO2' as VitalKey)
		},
		{
			id: 'respiration',
			header: 'R (/min)',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.respiration),
			cellClassGetter: (row) =>
				vitalTextClass(row.respiration, 'respiration' as VitalKey)
		},
		{
			id: 'rbs',
			header: 'RBS (mg/dL)',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) => formatVital(row.rbs),
			cellClassGetter: (row) =>
				vitalTextClass(row.rbs, 'rbs' as VitalKey)
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
			message={"Choose a visit using the 'Choose Visit' button above to record vitals."}
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
				{#if isLoadingVitals && vitals.length === 0}
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
							totalRowCount={totalVitals}
							showRefreshButton={true}
							emptyMessage="No vitals."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={true}
							columnFilters={tableFilters}
							useRemoteFilters={true}
							on:refresh={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchVitals(visit.patientId, visit.hospitalId, {
										force: true
									});
								}
							}}
							on:pageSizeChange={() => {
								if (pageSizeStr === lastHandledPageSize) {
									return;
								}
								lastHandledPageSize = pageSizeStr;
								currentPage = 1;
								if (visit?.patientId && visit?.hospitalId) {
									fetchVitals(visit.patientId, visit.hospitalId);
								}
							}}
							on:pageChange={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchVitals(visit.patientId, visit.hospitalId);
								}
							}}
							on:filtersChange={(event) => {
								if (filterDebounceTimeout) {
									clearTimeout(filterDebounceTimeout);
								}
								tableFilters = event.detail.filters;
								currentPage = 1;
								filterDebounceTimeout = setTimeout(() => {
									if (visit?.patientId && visit?.hospitalId) {
										fetchVitals(visit.patientId, visit.hospitalId);
									}
								}, 350);
							}}
						>
							<svelte:fragment slot="rowActions" let:row>
								<td class="w-24 shrink-0 text-right">
									<div class="flex justify-end gap-1">
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={() =>
												openEditDialog(
													row as PatientVitalWithVisit
												)}
										>
											<LucidePencil className="size-4" />
										</DaisyUiButton>
										<DaisyUiButton
											className="d-btn-ghost d-btn-error d-btn-sm"
											onClick={() =>
												handleDeleteVital(
													row as PatientVitalWithVisit
												)}
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
