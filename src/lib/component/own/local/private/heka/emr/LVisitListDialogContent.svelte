<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideTriangleAlert from '$lib/component/own/library/lucide/LucideTriangleAlert.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		getPatientVisitPaginatedForEmr,
		type PatientVisitWithRelationsForEmr,
		type VisitStatusCode
	} from '$lib/remote/table/information-table/patient-visit.remote';
	import { getVisitType } from '$lib/remote/table/information-table/visit-type.remote';
	import {
		getActivePatientAllergiesPatientIdsByPatientIds
	} from '$lib/remote/table/information-table/patient-allergies.remote';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { page } from '$app/state';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let result =
		$state<PaginatedResult<PatientVisitWithRelationsForEmr> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let visitTypeOptions = $state<
		{ id: number; name: string | null }[]
	>([]);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let isConfirming = $state(false);
	let activeAllergyPatientIds = $state<Set<string>>(new Set());

	const visits = $derived(result?.data ?? []);
	const totalPages = $derived(result?.totalPages ?? 1);
	const total = $derived(result?.total ?? 0);

	const visitStatusOptions: { value: VisitStatusCode; label: string }[] =
		[
			{ value: 'open', label: 'Open' },
			{ value: 'vital', label: 'Vital' },
			{ value: 'seen', label: 'Seen' },
			{ value: 'closed', label: 'Closed' }
		];

	function formatVisitStatus(status: VisitStatusCode | null | undefined) {
		return (
			visitStatusOptions.find((o) => o.value === status)?.label ??
			'—'
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

	const visitColumns: MariTableColumn<PatientVisitWithRelationsForEmr>[] =
		[
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-32',
			filterable: false,
			field: 'visitNo'
		},
		{
			id: 'patientCode',
			header: 'Patient Code',
			widthClass: 'w-32 min-w-[8rem]',
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
			filterOptionsGetter: () =>
				visitTypeOptions.map((vt) => ({
					value: String(vt.id),
					label: vt.name ?? `Type ${vt.id}`
				})),
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
				if (patientId == null) return null;

				return activeAllergyPatientIds.has(String(patientId))
					? {
							component: LucideTriangleAlert,
							props: { className: 'size-4' }
						}
					: null;
			},
			cellClassGetter: (row) => {
				const patientId = row.patient?.id;
				if (!patientId) return 'text-base-content/60';
				return activeAllergyPatientIds.has(String(patientId))
					? 'text-warning font-semibold'
					: 'text-base-content/60';
			}
		},
	];

	async function fetchPatients(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			result = await getPatientVisitPaginatedForEmr({
				page: currentPage,
				pageSize,
				hospitalId: hospitalId ?? undefined,
				patientName: tableFilters.patientName?.trim() || undefined,
				patientCode: tableFilters.patientCode?.trim() || undefined,
				hospitalName: tableFilters.hospitalName?.trim() || undefined,
				branchName: tableFilters.branchName?.trim() || undefined,
				doctorName: tableFilters.doctorName?.trim() || undefined,
				visitTypeId: tableFilters.visitType
					? Number(tableFilters.visitType)
					: undefined,
				visitStatus: (tableFilters.visitStatus?.trim() ||
					undefined) as VisitStatusCode | undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});

			const patientIds = result.data
				.map((row) => row.patient?.id)
				.map((id) => (id != null ? String(id) : ''))
				.filter((id) => id.trim() !== '');
			const activePatientIds =
				await getActivePatientAllergiesPatientIdsByPatientIds({
					patientIds
				});
			activeAllergyPatientIds = new Set(activePatientIds);
		} finally {
			isLoading = false;
		}
	}

	async function loadVisitTypes() {
		const all = await getVisitType();
		visitTypeOptions = all
			.map((v) => ({ id: v.id, name: v.name ?? null }))
			.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	}

	lifeCycleUtil.onMount(() => {
		fetchPatients();
		loadVisitTypes();
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

	async function selectPatient(v: PatientVisitWithRelationsForEmr) {
		if (isConfirming) return;
		isConfirming = true;
		const patient = v.patient;
		const patientName = patient
			? StringUtil.patientDisplayName(patient as any)
			: '';
		try {
			await confirm({
				visitId: v.id,
				patientName
			});
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="flex h-full min-h-[60vh] flex-col gap-0">
	<div
		class="flex items-center justify-between border-b border-base-300 px-4 py-2"
	>
		<h2 class="text-lg font-semibold">Visit List</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={cancel}
			disabled={isConfirming}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>

	{#if isLoading && !result}
		<div class="flex flex-1 items-center justify-center">
			<DaisyUiLoading className="d-loading-xl" />
		</div>
	{:else}
		<div
			class="min-h-0 flex-1 overflow-auto px-4 py-2 {TableEnum.HEIGHT}"
		>
			<MariTable
				rows={visits}
				columns={visitColumns}
				isLoading={isLoading || isConfirming}
				bind:pageSize={pageSizeStr}
				bind:currentPage
				totalRowCount={total}
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
					void selectPatient(
						event.detail as PatientVisitWithRelationsForEmr
					)}
			/>
		</div>
	{/if}

	<div
		class="flex items-center justify-between border-t border-base-200 px-4 py-2"
	>
		<div></div>
		<div class="flex gap-2">
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				onClick={cancel}
				disabled={isConfirming}
			>
				Cancel
			</DaisyUiButton>
		</div>
	</div>
</div>
