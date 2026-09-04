<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import LPatientAllergyDialogContent from '$lib/component/own/local/private/heka/emr/LPatientAllergyDialogContent.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	type PatientAllergyWithRelations = any;
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import MariTableEditDeleteActions from '$lib/component/own/library/mari/table/MariTableEditDeleteActions.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

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
	let patientAllergies = $state<PatientAllergyWithRelations[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoadingVisit = $state(false);
	let isLoadingAllergies = $state(false);
	let totalAllergies = $state(0);
	let tableFilters = $state<Record<string, string>>({
		status: String(StatusEnum.ACTIVE)
	});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastLoadedVisitKey = $state('');
	let lastHandledPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let lastAllergiesFetchKey = $state('');
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

	async function openAddDialog() {
		if (!visit?.patientId || !visitId) return;
		const patientId = visit.patientId;
		const hospitalIdParam = visit.hospitalId;
		PatientAllergyDialogState.patientId = patientId;
		PatientAllergyDialogState.visitId = visitId;
		PatientAllergyDialogState.hospitalId =
			hospitalIdParam ?? hospitalId ?? null;
		PatientAllergyDialogState.patientAllergyId = null;
		PatientAllergyDialogState.emrMutationViaNursingWorkbench = true;
		PatientAllergyDialogState.onSaved = () =>
			fetchAllergies(patientId, hospitalIdParam, { force: true });
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Add allergy to patient',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.patientId = null;
					PatientAllergyDialogState.visitId = null;
					PatientAllergyDialogState.hospitalId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.emrMutationViaNursingWorkbench = false;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) {
						fetchAllergies(patientId, hospitalIdParam, {
							force: true
						});
					}
				}
			});
		} finally {
			PatientAllergyDialogState.patientId = null;
			PatientAllergyDialogState.visitId = null;
			PatientAllergyDialogState.hospitalId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.emrMutationViaNursingWorkbench = false;
			PatientAllergyDialogState.onSaved = null;
		}
	}

	async function openEditDialog(row: PatientAllergyWithRelations) {
		if (!visit?.patientId) return;
		const patientId = visit.patientId;
		const hospitalIdParam = visit.hospitalId;
		PatientAllergyDialogState.patientId = patientId;
		PatientAllergyDialogState.visitId = row.visitId;
		PatientAllergyDialogState.hospitalId =
			hospitalIdParam ?? hospitalId ?? null;
		PatientAllergyDialogState.patientAllergyId = row.id;
		PatientAllergyDialogState.emrMutationViaNursingWorkbench = true;
		PatientAllergyDialogState.onSaved = () =>
			fetchAllergies(patientId, hospitalIdParam, { force: true });
		try {
			await dialogService.open<{ saved?: boolean }>({
				title: 'Edit patient allergy',
				component: LPatientAllergyDialogContent,
				fullScreen: false,
				modalClassName:
					'max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto',
				onClose: () => {
					PatientAllergyDialogState.hospitalId = null;
					PatientAllergyDialogState.patientAllergyId = null;
					PatientAllergyDialogState.emrMutationViaNursingWorkbench = false;
					PatientAllergyDialogState.onSaved = null;
				},
				onConfirm: (data) => {
					if (data?.saved) {
						fetchAllergies(patientId, hospitalIdParam, {
							force: true
						});
					}
				}
			});
		} finally {
			PatientAllergyDialogState.hospitalId = null;
			PatientAllergyDialogState.patientAllergyId = null;
			PatientAllergyDialogState.emrMutationViaNursingWorkbench = false;
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
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/allergy?id=${row.id}`,
				{ method: 'DELETE' }
			);
			if (!res.ok) throw new Error(`Delete failed (${res.status})`);
			toastSuccess(
				toastService,
				m.entity_patient_allergy(),
				m.toast_action_removed()
			);
			if (visit?.patientId && visit?.hospitalId) {
				await fetchAllergies(visit.patientId, visit.hospitalId, {
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
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/allergy?mode=visit.get&visitId=${visitId}`
			);
			if (!res.ok)
				throw new Error(`Visit load failed (${res.status})`);
			const v = await res.json();
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

	async function fetchAllergies(
		patientId: string,
		hospitalIdParam: string | undefined,
		options?: { force?: boolean }
	) {
		const pageSize = Number(pageSizeStr) || 10;
		const requestKey = JSON.stringify({
			patientId,
			hospitalIdParam,
			page: currentPage,
			pageSize,
			visitNo: tableFilters.visitNo?.trim() || '',
			severity: tableFilters.severity?.trim() || '',
			status: tableFilters.status ?? ''
		});
		if (!options?.force && requestKey === lastAllergiesFetchKey) {
			return;
		}
		lastAllergiesFetchKey = requestKey;
		isLoadingAllergies = true;
		try {
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const qs = new URLSearchParams({
				mode: 'allergy.listPaginated',
				patientId,
				page: String(currentPage),
				pageSize: String(pageSize)
			});
			if (tableFilters.visitNo?.trim())
				qs.set('visitNo', tableFilters.visitNo.trim());
			if (tableFilters.severity?.trim())
				qs.set('severityName', tableFilters.severity.trim());
			if (statusId != null && Number.isFinite(statusId))
				qs.set('statusId', String(statusId));

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/allergy?${qs.toString()}`
			);
			if (!res.ok)
				throw new Error(`Allergy load failed (${res.status})`);
			const result = await res.json();
			patientAllergies = result.data;
			totalAllergies = result.total;
		} catch (err) {
			console.error(err);
			patientAllergies = [];
			totalAllergies = 0;
		} finally {
			isLoadingAllergies = false;
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
					await fetchAllergies(
						resolvedVisit.patientId,
						resolvedVisit.hospitalId
					);
				}
			})();
		} else {
			lastLoadedVisitKey = '';
			visit = null;
			patientAllergies = [];
		}
	});

	function formatText(value: string | null | undefined): string {
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

	const statusFilterOptions = [
		{ label: 'Active', value: String(StatusEnum.ACTIVE) },
		{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
	];

	const allergyColumns: MariTableColumn<PatientAllergyWithRelations>[] =
		[
			{
				id: 'visitNo',
				header: 'Visit No',
				widthClass: TableRowEnum.VISIT_NO_WIDTH,
				filterable: true,
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
				widthClass: 'w-28',
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
				id: 'severity',
				header: 'Severity',
				widthClass: 'w-30',
				filterable: true,
				filterType: 'select',
				filterMasterKey: 'severity',
				format: (_value, row) =>
					formatText(row.severity?.name ?? null)
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
			message={'Choose a visit using the "Choose Visit" button above to add or view allergies.'}
			className="z-0"
		/>
	{:else if !visit && !isLoadingVisit}
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
				{#if !visit}
					<div
						class="flex min-h-32 items-center justify-center text-sm text-base-content/70"
					>
						Loading visit…
					</div>
				{:else if patientAllergies.length === 0 && !isLoadingAllergies}
					<p class="text-sm text-base-content/70">
						No allergies recorded for this patient yet.
					</p>
				{:else}
					<div class="flex flex-col gap-3 {TableEnum.HEIGHT}">
						<MariTable
							rows={patientAllergies}
							columns={allergyColumns}
							masterFilterHospitalId={visit?.hospitalId ?? hospitalId}
							isLoading={isLoadingVisit || isLoadingAllergies}
							bind:pageSize={pageSizeStr}
							bind:currentPage
							totalRowCount={totalAllergies}
							showRefreshButton={true}
							emptyMessage="No allergies."
							showRowActions={true}
							actionsHeader="Actions"
							actionsVariant="none"
							enableColumnFilters={true}
							columnFilters={tableFilters}
							useRemoteFilters={true}
							on:refresh={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchAllergies(visit.patientId, visit.hospitalId, {
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
									fetchAllergies(visit.patientId, visit.hospitalId);
								}
							}}
							on:pageChange={() => {
								if (visit?.patientId && visit?.hospitalId) {
									fetchAllergies(visit.patientId, visit.hospitalId);
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
										fetchAllergies(visit.patientId, visit.hospitalId);
									}
								}, 350);
							}}
						>
							{#snippet rowActions(row, rowIndex)}
								<MariTableEditDeleteActions
									onEdit={() =>
										openEditDialog(row as PatientAllergyWithRelations)}
									onDelete={() =>
										handleDelete(row as PatientAllergyWithRelations)}
								/>
							{/snippet}
						</MariTable>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
