<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiPagination from '$lib/component/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import {
		getPatientPaginated,
		deletePatient,
		getPatientByIdWithRelations,
		type PatientWithRelations
	} from '$lib/tool/remote/table/information-table/patient.http.tool.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DeletePatientConfirmState } from '$lib/state/delete-patient-confirm.state.svelte';
	import DeletePatientConfirmModal from '$lib/component/own/snippet/modal/DeletePatientConfirmModal.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { YesNoEnum } from '$lib/model/enum/db-link';
	import type { PaginatedResult } from '$lib/tool/remote/table/pagination-type';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { page } from '$app/state';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import {
		hekaHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import LPatientListViewEditModal from '$lib/component/own/local/private/heka/patient/list/LPatientListViewEditModal.svelte';
	import LPatientCardPrintModal from '$lib/component/own/local/private/heka/patient/list/LPatientCardPrintModal.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';

	const stringUtil = new StringUtil();
	const dateTimeUtil = new DateTimeUtil();
	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let patientResult =
		$state<PaginatedResult<PatientWithRelations> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);
	let deletingId = $state<string | null>(null);
	let tableFilters = $state<Record<string, string>>({});

	const refreshLock = createActionLock();
	const tableFetchLock = createActionLock();
	const filterFetchLock = createActionLock();
	const deleteLock = createActionLock();
	const dialogCloseLock = createActionLock();
	const emrSelectLock = createActionLock();
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	let patientList = $derived(patientResult?.data ?? []);
	const totalPages = $derived(patientResult?.totalPages ?? 1);
	const total = $derived(patientResult?.total ?? 0);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);
	const selectForEmr = $derived(
		page.url.searchParams.get('selectFor') === 'emr'
	);

	async function fetchPatients(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			patientResult = await getPatientPaginated({
				page: currentPage,
				pageSize,
				hospitalId: hospitalId ?? undefined,
				patientCode: tableFilters.code?.trim() || undefined,
				patientName: tableFilters.name?.trim() || undefined,
				patientPhonePrimary:
					tableFilters.phonePrimary?.trim() || undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchPatients();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
		if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
	});

	let searchDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let isFirstSearchEffect = true;
	$effect(() => {
		if (isFirstSearchEffect) {
			isFirstSearchEffect = false;
			return;
		}
		if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		searchDebounceTimeout = setTimeout(() => {
			currentPage = 1;
			void filterFetchLock.run(async () => fetchPatients());
		}, 350);
		return () => {
			if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		};
	});

	async function handleTableRefresh() {
		await refreshLock.run(async () =>
			fetchPatients({ bustCache: true })
		);
	}

	async function handleTablePageChange() {
		await tableFetchLock.run(async () => fetchPatients());
	}

	async function handleTablePageSizeChange() {
		currentPage = 1;
		await tableFetchLock.run(async () => fetchPatients());
	}

	async function handleDelete(patientId: string) {
		await deleteLock.run(async () => {
			deletingId = patientId;
			try {
				const patient = await getPatientByIdWithRelations({
					id: patientId
				});
				const patientEmail =
					(patient as { user?: { email?: string } })?.user
						?.email ?? '(no email)';
				DeletePatientConfirmState.pending = {
					id: patientId,
					email: patientEmail
				};
				const result = await dialogService.open({
					component: DeletePatientConfirmModal
				});
				if (result.confirmed && typeof result.data === 'string') {
					await deletePatient({ id: result.data });
					await fetchPatients();
					toastService.addToast(
						'Patient deleted.',
						StatusColorEnum.SUCCESS
					);
				}
			} catch (err) {
				console.error(err);
				toastService.addToast(
					'Failed to delete patient.',
					StatusColorEnum.ERROR
				);
			} finally {
				DeletePatientConfirmState.pending = null;
				deletingId = null;
			}
		});
	}

	function rowActionDisabled(rowId: string) {
		return isLoading || deletingId === rowId;
	}

	const PATIENT_COLUMN_COUNT = 12;

	type PatientDialogMode = 'view' | 'edit';
	let patientDialog = $state<{
		mode: PatientDialogMode;
		patientId: string;
	} | null>(null);

	let patientCardDialog = $state<{
		patientId: string;
	} | null>(null);

	function openPatientCard(id: string) {
		patientCardDialog = { patientId: id };
	}

	function closePatientCardDialog() {
		patientCardDialog = null;
	}

	const registrationPath = $derived(
		page.url.pathname.replace(/\/list\/?$/, '') + '/registration'
	);
	const patientDialogIframeSrc = $derived(
		patientDialog
			? `${registrationPath}?${patientDialog.mode}=${patientDialog.patientId}&embed=1`
			: ''
	);

	function viewData(id: string) {
		patientDialog = { mode: 'view', patientId: id };
	}

	function editData(id: string) {
		patientDialog = { mode: 'edit', patientId: id };
	}

	function closePatientDialog() {
		patientDialog = null;
		void dialogCloseLock.run(async () =>
			fetchPatients({ bustCache: true })
		);
	}

	function handleSelectForEmr(patient: PatientWithRelations) {
		void emrSelectLock.run(() => {
			selectForEmrPatient(patient);
		});
	}

	const patientColumns: MariTableColumn<PatientWithRelations>[] = [
		{
			id: 'code',
			header: 'Patient Code',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true
		},
		{
			id: 'name',
			header: 'Name',
			widthClass: 'w-64 min-w-[16rem]',
			filterable: true,
			format: (_value, row) => StringUtil.patientDisplayName(row)
		},
		{
			id: 'identity',
			header: 'Identity',
			widthClass: 'w-64 min-w-[16rem]',
			filterable: false,
			format: (_value, row) => {
				const r = row as PatientWithRelations;
				return `(${r.identityType?.name ?? '—'}) ${
					r.identityNo ?? '—'
				}`;
			}
		},
		{
			id: 'phonePrimary',
			header: 'Phone primary',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true
		},
		{
			id: 'phoneSecondary',
			header: 'Phone secondary',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false
		},
		{
			id: 'dateOfBirth',
			header: 'Date of birth',
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			format: (value) => dateTimeUtil.formatDate(value as string)
		},
		{
			id: 'guardian',
			header: 'Guardian',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false,
			format: (_value, row) => {
				const r = row as PatientWithRelations;
				if (!r.guardianName && !r.guardianPhone) return '—';
				return `${r.guardianName ?? '—'}${
					r.guardianPhone ? ` · ${r.guardianPhone}` : ''
				}`;
			}
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-32 min-w-[8rem]',
			defaultFilterValue: 'Active',
			filterable: false,
			field: 'status.name'
		},
		{
			id: 'createdAt',
			header: 'Created at',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => dateTimeUtil.formatDateTime(value as string)
		},
		{
			id: 'updatedAt',
			header: 'Updated at',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => dateTimeUtil.formatDateTime(value as string)
		}
	];

	function selectForEmrPatient(patient: PatientWithRelations) {
		if (!hospitalId) return;
		const baseUrl = hekaHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.HEKA_HOME_NURSING_WORKBENCH_EMR_VITAL
		);
		const url = `${baseUrl}?patientId=${encodeURIComponent(patient.id)}`;
		routerUtil.replaceRoute(url);
	}
</script>

{#if isLoading && !patientResult}
	<div class="flex items-center justify-center">
		<DaisyUiLoading className="d-loading-xl" />
	</div>
{:else}
	<div class={TableEnum.HEIGHT}>
		<MariTable
			rows={patientList}
			columns={patientColumns}
			{isLoading}
			bind:pageSize={filterPageSize}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip="Refresh data"
			emptyMessage="No patients found."
			showRowActions={true}
			actionsVariant="none"
			enableColumnFilters={true}
			useRemoteFilters={true}
			rowTooltipGetter={(row) => {
				return StringUtil.tableToolTip(row);
			}}
			on:refresh={handleTableRefresh}
			on:pageSizeChange={handleTablePageSizeChange}
			on:pageChange={handleTablePageChange}
			on:filtersChange={(event) => {
				if (filterDebounceTimeout) {
					clearTimeout(filterDebounceTimeout);
				}
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(() => {
					void filterFetchLock.run(async () => fetchPatients());
				}, 350);
			}}
		>
			<svelte:fragment slot="rowActions" let:row>
				{@const patientRow = row as PatientWithRelations}
				<div class="flex flex-col items-center gap-1">
					<DaisyUiTooltip
						tooltipText="view data"
						className="d-tooltip-ghost d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							disabled={rowActionDisabled(patientRow.id)}
							onClick={() => viewData(patientRow.id)}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip
						tooltipText="edit data"
						className="d-tooltip-accent d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-accent"
							disabled={rowActionDisabled(patientRow.id)}
							onClick={() => editData(patientRow.id)}
						>
							<LucidePencil className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					{#if selectForEmr}
						<DaisyUiTooltip
							tooltipText="select for EMR"
							className="d-tooltip-info d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-info"
								disabled={rowActionDisabled(patientRow.id)}
								onClick={() => handleSelectForEmr(patientRow)}
							>
								<LucideChevronRight className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}
					<DaisyUiTooltip
						tooltipText="patient card / print"
						className="d-tooltip-info d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							disabled={rowActionDisabled(patientRow.id)}
							onClick={() => openPatientCard(patientRow.id)}
						>
							<LucidePrinter className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip
						tooltipText="delete data"
						className="d-tooltip-error d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm d-btn-error"
							disabled={rowActionDisabled(patientRow.id)}
							loading={deletingId === patientRow.id}
							loadingText=""
							onClick={() => handleDelete(patientRow.id)}
						>
							<LucideTrash2 className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			</svelte:fragment>
		</MariTable>
	</div>
{/if}

<!-- Full-screen view/edit patient dialog -->
{#if patientDialog}
	<LPatientListViewEditModal
		{patientDialog}
		{patientDialogIframeSrc}
		{closePatientDialog}
	/>
{/if}

{#if patientCardDialog}
	<LPatientCardPrintModal
		patientId={patientCardDialog.patientId}
		onClose={closePatientCardDialog}
	/>
{/if}
