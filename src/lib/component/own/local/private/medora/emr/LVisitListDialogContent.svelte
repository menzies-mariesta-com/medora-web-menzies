<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LVisitAlertIndicators from '$lib/component/own/local/private/medora/emr/LVisitAlertIndicators.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		PatientVisitForEmrList,
		VisitStatusCode
	} from '$lib/model/type/medora/emr/visit-list.type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { page } from '$app/state';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';

	const VISIT_LIST_DEFAULT_PAGE_SIZE = 20;

	const lifeCycleUtil = new LifeCycleUtil();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let result = $state<PaginatedResult<PatientVisitForEmrList> | null>(
		null
	);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${VISIT_LIST_DEFAULT_PAGE_SIZE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let isConfirming = $state(false);
	let activeAllergyPatientIds = $state<Set<string>>(new Set());
	let abnormalVitalVisitIds = $state<Set<number>>(new Set());

	const visits = $derived(result?.data ?? []);
	const totalPages = $derived(result?.totalPages ?? 1);
	const total = $derived(result?.total ?? 0);

	const endpointBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/emr/visit-list`
			: ''
	);

	const visitStatusOptions: {
		value: VisitStatusCode;
		label: string;
	}[] = [
		{ value: 'open', label: 'Open' },
		{ value: 'vital', label: 'Vital' },
		{ value: 'seen', label: 'Seen' },
		{ value: 'closed', label: 'Closed' }
	];

	function formatVisitStatus(
		status: VisitStatusCode | null | undefined
	) {
		return (
			visitStatusOptions.find((o) => o.value === status)?.label ?? '—'
		);
	}

	function formatVisitDate(value: string | null | undefined): string {
		if (!value) return '';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '';
		}
	}

	function getPatientAgeYears(
		dob: string | null | undefined
	): string {
		if (!dob) return '—';
		const birth = new Date(dob);
		if (Number.isNaN(birth.getTime())) return '—';
		const today = new Date();
		let years = today.getFullYear() - birth.getFullYear();
		const m = today.getMonth() - birth.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
			years -= 1;
		}
		return `${years}y`;
	}

	const visitColumns: MenziesTableColumn<PatientVisitForEmrList>[] = [
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
			header: 'Patient Name',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: true,
			format: (_value, row) =>
				row.patient
					? StringUtil.patientDisplayName(row.patient as any)
					: '—'
		},
		{
			id: 'patientAge',
			header: 'Age',
			widthClass: 'w-20 min-w-[5rem]',
			filterable: false,
			format: (_value, row) =>
				row.patient
					? getPatientAgeYears(
							(row.patient as any).dateOfBirth as
								| string
								| null
								| undefined
						)
					: '—'
		},
		{
			id: 'patientGender',
			header: 'Gender',
			widthClass: 'w-24 min-w-[6rem]',
			filterable: false,
			format: (_value, row) => row.patient?.gender?.name ?? '—'
		},
		{
			id: 'hospitalName',
			header: 'Hospital Name',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true,
			field: 'hospital.name'
		},
		{
			id: 'branchName',
			header: 'Branch Name',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true,
			field: 'branch.name'
		},
		{
			id: 'doctorName',
			header: 'Doctor Name',
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
			id: 'visitDate',
			header: 'Visit Date',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (_value, row) =>
				formatVisitDate(
					(row as any).createdAt as string | null | undefined
				)
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
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptionsGetter: () => visitStatusOptions,
			field: 'visitStatus',
			format: (_value, row) => formatVisitStatus(row.visitStatus)
		},
		{
			id: 'alert',
			header: m.observation_emr_alert(),
			widthClass: 'w-14 min-w-[3.5rem]',
			filterable: false,
			format: () => '—',
			cellComponentGetter: (row) => {
				const patientId = row.patient?.id;
				const hasAbnormalVital = abnormalVitalVisitIds.has(row.id);
				if (patientId == null && !hasAbnormalVital) return null;
				const hasAllergyAlert = activeAllergyPatientIds.has(
					String(patientId)
				);

				return hasAbnormalVital || hasAllergyAlert
					? {
							component: LVisitAlertIndicators,
							props: {
								hasVitalAlert: hasAbnormalVital,
								hasAllergyAlert
							}
						}
					: null;
			},
			cellClassGetter: (row) => {
				const patientId = row.patient?.id;
				const hasAbnormalVital = abnormalVitalVisitIds.has(row.id);
				if (!patientId && !hasAbnormalVital)
					return 'text-base-content/60';
				const hasAllergyAlert = activeAllergyPatientIds.has(
					String(patientId)
				);
				if (hasAbnormalVital && hasAllergyAlert) {
					return 'text-error font-semibold';
				}
				if (hasAbnormalVital || hasAllergyAlert) {
					return 'text-warning font-semibold';
				}
				return 'text-base-content/60';
			}
		}
	];

	async function fetchPatients(opts?: { bustCache?: boolean }) {
		if (!endpointBase) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || VISIT_LIST_DEFAULT_PAGE_SIZE;
		try {
			const params = new URLSearchParams();
			params.set('mode', 'visit.list');
			params.set('page', String(currentPage));
			params.set('pageSize', String(pageSize));

			const visitNo = tableFilters.visitNo?.trim();
			if (visitNo) params.set('visitNo', visitNo);
			const patientName = tableFilters.patientName?.trim();
			if (patientName) params.set('patientName', patientName);
			const patientCode = tableFilters.patientCode?.trim();
			if (patientCode) params.set('patientCode', patientCode);
			const hospitalName = tableFilters.hospitalName?.trim();
			if (hospitalName) params.set('hospitalName', hospitalName);
			const branchName = tableFilters.branchName?.trim();
			if (branchName) params.set('branchName', branchName);
			const doctorName = tableFilters.doctorName?.trim();
			if (doctorName) params.set('doctorName', doctorName);
			const visitType = tableFilters.visitType?.trim();
			if (visitType) params.set('visitType', visitType);
			const visitStatus = tableFilters.visitStatus?.trim();
			if (visitStatus) params.set('visitStatus', visitStatus);
			if (opts?.bustCache) params.set('_t', String(Date.now()));

			const res = await fetch(`${endpointBase}?${params.toString()}`);
			if (!res.ok)
				throw new Error(`Failed to load visits (${res.status})`);
			const data = (await res.json()) as {
				result: PaginatedResult<PatientVisitForEmrList>;
				activeAllergyPatientIds: string[];
				abnormalVitalVisitIds: number[];
			};
			result = data.result;
			activeAllergyPatientIds = new Set(
				(data.activeAllergyPatientIds ?? []).map(String)
			);
			abnormalVitalVisitIds = new Set(
				(data.abnormalVitalVisitIds ?? []).map(Number)
			);
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchPatients();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});

	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function handleFilterChange() {
		currentPage = 1;
		fetchPatients({ bustCache: true });
	}

	async function selectPatient(v: PatientVisitForEmrList) {
		if (isConfirming) return;
		isConfirming = true;
		const patient = v.patient;
		const patientName = patient
			? StringUtil.patientDisplayName(patient as any)
			: '';
		try {
			// Doctor explicitly selecting a visit should mark it as "Seen".
			if (endpointBase) {
				const res = await fetch(endpointBase, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'visit.markSeen',
						visitId: v.id
					})
				});
				if (!res.ok)
					throw new Error(
						`Failed to mark visit as seen (${res.status})`
					);
			}
			await confirm({
				visitId: v.id,
				patientName
			});
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden">
	<div class="flex min-h-0 flex-1 flex-col px-4 py-2">
		<MenziesTable
			rows={visits}
			columns={visitColumns}
			masterFilterHospitalId={hospitalId}
			isLoading={isLoading || isConfirming}
			bind:pageSize={pageSizeStr}
			pageSizeOptions={[10, 20, 25, 50, 100]}
			bind:currentPage
			totalRowCount={total}
			fillParent={true}
			showRefreshButton={true}
			refreshTooltip="Refresh visits"
			emptyMessage="No visits found."
			showRowActions={true}
			actionsHeader="Actions"
			actionsVariant="select"
			enableColumnFilters={true}
			useRemoteFilters={true}
			on:refresh={() => fetchPatients({ bustCache: true })}
			on:pageSizeChange={() => {
				currentPage = 1;
				fetchPatients();
			}}
			on:pageChange={() => fetchPatients()}
			on:filtersChange={(event) => {
				if (filterDebounceTimeout) {
					clearTimeout(filterDebounceTimeout);
				}
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(() => {
					fetchPatients({ bustCache: true });
				}, 350);
			}}
			on:select={(event) =>
				void selectPatient(event.detail as PatientVisitForEmrList)}
		/>
	</div>
	<div class="modal-action shrink-0 border-t border-base-300 px-4 py-3">
		<WashButton variant="ghost" onClick={cancel}>{m.cancel()}</WashButton>
	</div>
</div>
