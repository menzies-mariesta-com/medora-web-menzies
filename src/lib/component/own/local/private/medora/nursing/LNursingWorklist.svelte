<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LVisitAlertIndicators from '$lib/component/own/local/private/medora/emr/LVisitAlertIndicators.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucideClipboardList from '$lib/component/own/library/lucide/LucideClipboardList.svelte';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		PatientVisitForEmrList,
		VisitStatusFilterCode
	} from '$lib/model/type/medora/emr/visit-list.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { buildNursingChartUrl } from '$lib/tool/nursing/nursing-worklist.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	function tr(key: string, fallback: string): string {
		const fn = msg[key];
		return typeof fn === 'function' ? fn() : fallback;
	}

	const DEFAULT_PAGE_SIZE = 20;

	type AppPath = Parameters<typeof resolve>[0];

	function navigate(path: string) {
		void goto(resolve(path as AppPath));
	}

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const endpointBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/emr/visit-list`
			: ''
	);

	const visitStatusOptions: {
		value: VisitStatusFilterCode;
		label: string;
	}[] = [
		{ value: 'active', label: 'Active' },
		{ value: 'open', label: 'Open' },
		{ value: 'vital', label: 'Vital' },
		{ value: 'seen', label: 'Seen' },
		{ value: 'closed_discharged', label: 'Closed / Discharged' }
	];

	function formatVisitStatus(
		status: PatientVisitForEmrList['visitStatus'] | null | undefined
	): string {
		return (
			visitStatusOptions.find((o) => o.value === status)?.label ?? '—'
		);
	}

	function formatVisitDate(
		value: string | Date | null | undefined
	): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleString('en-US', {
			dateStyle: 'short',
			timeStyle: 'short'
		});
	}

	function getPatientAgeYears(
		dob: string | null | undefined
	): string {
		if (!dob) return '—';
		const birth = new Date(dob);
		if (Number.isNaN(birth.getTime())) return '—';
		const today = new Date();
		let years = today.getFullYear() - birth.getFullYear();
		const monthDelta = today.getMonth() - birth.getMonth();
		if (
			monthDelta < 0 ||
			(monthDelta === 0 && today.getDate() < birth.getDate())
		) {
			years -= 1;
		}
		return `${years}y`;
	}

	let result = $state<PaginatedResult<PatientVisitForEmrList> | null>(
		null
	);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${DEFAULT_PAGE_SIZE}`);
	let isLoading = $state(false);
	let loadError = $state('');
	let tableFilters = $state<Record<string, string>>({
		visitStatus: 'active'
	});
	let activeAllergyPatientIds = $state<Set<string>>(new Set());
	let abnormalVitalVisitIds = $state<Set<string>>(new Set());

	const visits = $derived(result?.data ?? []);
	const total = $derived(result?.total ?? 0);

	const columns: MenziesTableColumn<PatientVisitForEmrList>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: TableRowEnum.VISIT_NO_WIDTH,
			filterable: true,
			field: 'visitNo'
		},
		{
			id: 'patientCode',
			header: 'Patient Code',
			widthClass: TableRowEnum.PATIENT_CODE_WIDTH,
			filterable: true,
			field: 'patient.code'
		},
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: true,
			format: (_value, row) =>
				row.patient ? StringUtil.patientDisplayName(row.patient) : '—'
		},
		{
			id: 'patientAge',
			header: 'Age',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) =>
				getPatientAgeYears(row.patient?.dateOfBirth)
		},
		{
			id: 'patientGender',
			header: 'Gender',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) => row.patient?.gender?.name ?? '—'
		},
		{
			id: 'visitType',
			header: 'Visit Type',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true,
			filterType: 'select',
			filterMasterKey: 'visitType',
			field: 'visitType.name'
		},
		{
			id: 'visitStatus',
			header: 'Visit Status',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true,
			filterType: 'select',
			filterOptionsGetter: () => visitStatusOptions,
			field: 'visitStatus',
			format: (_value, row) => formatVisitStatus(row.visitStatus)
		},
		{
			id: 'doctorName',
			header: 'Doctor',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true,
			format: (_value, row) =>
				row.doctor
					? StringUtil.fullNameWithTitle(
							row.doctor.title?.name ?? null,
							row.doctor.firstName,
							row.doctor.middleName,
							row.doctor.lastName
						)
					: '—'
		},
		{
			id: 'branchName',
			header: 'Branch',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true,
			field: 'branch.name'
		},
		{
			id: 'visitDate',
			header: 'Visit Date',
			widthClass: 'w-44 min-w-[11rem]',
			filterable: false,
			format: (_value, row) => formatVisitDate(row.createdAt)
		},
		{
			id: 'alert',
			header: 'Alert',
			widthClass: 'w-14 min-w-[3.5rem]',
			filterable: false,
			format: () => '—',
			cellComponentGetter: (row) => {
				const hasVitalAlert = abnormalVitalVisitIds.has(row.id);
				const hasAllergyAlert =
					row.patient?.id != null &&
					activeAllergyPatientIds.has(String(row.patient.id));
				if (!hasVitalAlert && !hasAllergyAlert) return null;
				return {
					component: LVisitAlertIndicators,
					props: { hasVitalAlert, hasAllergyAlert }
				};
			},
			cellClassGetter: (row) => {
				const hasVitalAlert = abnormalVitalVisitIds.has(row.id);
				const hasAllergyAlert =
					row.patient?.id != null &&
					activeAllergyPatientIds.has(String(row.patient.id));
				if (hasVitalAlert && hasAllergyAlert) {
					return 'text-error font-semibold';
				}
				if (hasVitalAlert || hasAllergyAlert) {
					return 'text-warning font-semibold';
				}
				return 'text-base-content/60';
			}
		}
	];

	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	async function fetchVisits(opts?: { bustCache?: boolean }) {
		if (!endpointBase) return;
		isLoading = true;
		loadError = '';
		try {
			const pageSize = Number(pageSizeStr) || DEFAULT_PAGE_SIZE;
			const params = new SvelteURLSearchParams();
			params.set('mode', 'visit.list');
			params.set('page', String(currentPage));
			params.set('pageSize', String(pageSize));

			for (const key of [
				'visitNo',
				'patientName',
				'patientCode',
				'hospitalName',
				'branchName',
				'doctorName',
				'visitType',
				'visitStatus'
			]) {
				const value = tableFilters[key]?.trim();
				if (value) params.set(key, value);
			}
			if (tableFilters.hasActiveAdmission === '1') {
				params.set('hasActiveAdmission', '1');
			}
			if (opts?.bustCache) params.set('_t', String(Date.now()));

			const res = await fetch(
				`${endpointBase}?${params.toString()}`,
				{
					credentials: 'include',
					cache: 'no-store'
				}
			);
			if (!res.ok) await throwUserFacingHttpError(res);

			const payload = (await res.json()) as {
				result: PaginatedResult<PatientVisitForEmrList>;
				activeAllergyPatientIds: string[];
				abnormalVitalVisitIds: string[];
			};
			result = payload.result;
			activeAllergyPatientIds = new Set(
				(payload.activeAllergyPatientIds ?? []).map(String)
			);
			abnormalVitalVisitIds = new Set(
				(payload.abnormalVitalVisitIds ?? []).map(String)
			);
		} catch (error) {
			loadError =
				error instanceof Error
					? error.message
					: 'Failed to load the nursing worklist.';
			toastService.addToast(loadError, StatusColorEnum.ERROR);
		} finally {
			isLoading = false;
		}
	}

	function openChart(row: PatientVisitForEmrList) {
		if (!hospitalId) return;
		navigate(
			buildNursingChartUrl({
				hospitalId,
				visitId: String(row.id)
			})
		);
	}

	function openPath(path: string) {
		if (!hospitalId) return;
		navigate(`/medora/hospital/${hospitalId}/home/${path}`);
	}

	function handleFiltersChange(filters: Record<string, string>) {
		tableFilters = filters;
		currentPage = 1;
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
		filterDebounceTimeout = setTimeout(() => {
			void fetchVisits({ bustCache: true });
		}, 350);
	}

	lifeCycleUtil.onMount(() => {
		void fetchVisits();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
	<div
		class="flex shrink-0 flex-wrap items-start justify-between gap-3"
	>
		<div class="min-w-0">
			<h1 class="text-lg font-bold text-primary">
				{tr('nursing_worklist_title', 'Nursing')}
			</h1>
			<p class="text-sm opacity-70">
				{tr(
					'nursing_worklist_intro',
					'Active OPD, IPD and ED patients. Open a patient to chart in the shared nursing chart.'
				)}
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<WashButton
				className="btn-sm btn-outline cursor-pointer"
				onClick={() =>
					openPath(
						'nursing-workbench/patient-visit-history-dashboard'
					)}
			>
				{tr('nursing_worklist_open_opd', 'Visit history')}
			</WashButton>
			<WashButton
				className="btn-sm btn-outline cursor-pointer"
				onClick={() => openPath('nursing-workbench/census')}
			>
				{tr('nursing_worklist_open_ipd', 'Census')}
			</WashButton>
			<WashButton
				className="btn-sm btn-outline cursor-pointer"
				onClick={() => openPath('nursing-workbench/track-board')}
			>
				{tr('nursing_worklist_open_ed', 'Track board')}
			</WashButton>
			<WashButton
				className="btn-sm btn-ghost cursor-pointer"
				onClick={() => openPath('nursing-workbench/emar')}
			>
				{tr('nursing_worklist_open_emar', 'eMAR')}
			</WashButton>
			<WashButton
				className="btn-sm btn-ghost cursor-pointer"
				onClick={() => openPath('nursing-workbench/care-plan')}
			>
				{tr('nursing_worklist_open_care_plan', 'Care plans')}
			</WashButton>
		</div>
	</div>

	{#if loadError}
		<p class="text-sm text-error">{loadError}</p>
	{/if}

	<div class={TableEnum.HEIGHT}>
		<MenziesTable
			title={tr('nursing_worklist_table_title', 'Patient worklist')}
			rows={visits}
			{columns}
			masterFilterHospitalId={hospitalId || undefined}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			bind:columnFilters={tableFilters}
			pageSizeOptions={[10, 20, 25, 50, 100]}
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip="Refresh worklist"
			emptyMessage="No active patients"
			showRowActions={true}
			actionsHeader="Actions"
			actionsVariant="none"
			enableColumnFilters={true}
			on:refresh={() => fetchVisits({ bustCache: true })}
			on:pageSizeChange={() => {
				currentPage = 1;
				void fetchVisits();
			}}
			on:pageChange={() => void fetchVisits()}
			on:filtersChange={(event) =>
				handleFiltersChange(event.detail.filters)}
			on:rowClick={(event) =>
				openChart(event.detail as PatientVisitForEmrList)}
		>
			{#snippet rowActions(row)}
				<MenziesTableIconAction
					tooltipText="Open nursing chart"
					color="primary"
					onClick={() => openChart(row as PatientVisitForEmrList)}
				>
					{#snippet icon()}
						<LucideClipboardList className="size-3.5" />
					{/snippet}
				</MenziesTableIconAction>
			{/snippet}
		</MenziesTable>
	</div>
</div>
