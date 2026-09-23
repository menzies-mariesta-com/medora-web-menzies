<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import type { IpdCensusRow, WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import LIpdTransferDialogContent from '$lib/component/own/local/private/medora/ipd/LIpdTransferDialogContent.svelte';
	import { IpdTransferDialogState } from '$lib/state/ipd-transfer-dialog.state.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		buildConsultationEmrUrl,
		buildIpdNursingEmrUrl
	} from '$lib/tool/ipd/ipd-nursing-redirect.util';
	import { VisitTypeEnum } from '$lib/model/enum/db-link';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const censusApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/ipd/census`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1`
			: ''
	);

	let rows = $state<IpdCensusRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let wardFilter = $state('');
	let wards = $state<WardRow[]>([]);
	let search = $state('');

	const wardOptions = $derived(
		wards.map((w) => ({ value: String(w.id), label: w.name }))
	);

	const columns: MenziesTableColumn<IpdCensusRow>[] = [
		{
			id: 'admissionNo',
			header: 'Admission No',
			widthClass: 'w-40 min-w-[9rem]',
			field: 'admissionNo'
		},
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'visitNo'
		},
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			field: 'patientName'
		},
		{
			id: 'wardName',
			header: 'Ward',
			widthClass: 'w-36 min-w-[8rem]',
			field: 'wardName'
		},
		{
			id: 'bedName',
			header: 'Bed',
			widthClass: 'w-28 min-w-[6rem]',
			field: 'bedName'
		},
		{
			id: 'admittedAt',
			header: 'Admitted',
			widthClass: 'w-44 min-w-[10rem]',
			format: (_v, row) =>
				row.admittedAt
					? new Date(row.admittedAt).toLocaleString()
					: '—'
		},
		{
			id: 'admittingDoctorName',
			header: 'Doctor',
			widthClass: 'w-40 min-w-[9rem]',
			field: 'admittingDoctorName'
		}
	];

	async function fetchRows() {
		if (!censusApi) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams();
			qs.set('page', String(currentPage));
			qs.set('pageSize', String(Number(pageSizeStr) || 10));
			if (wardFilter) qs.set('wardId', wardFilter);
			if (search.trim()) qs.set('search', search.trim());
			const res = await fetch(`${censusApi}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) throw new Error(await res.text());
			const result = (await res.json()) as {
				data: IpdCensusRow[];
				total: number;
				totalPages: number;
			};
			rows = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Load failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(wardApi, { credentials: 'include' });
		if (res.ok) wards = (await res.json()) as WardRow[];
	}

	async function openTransfer(row: IpdCensusRow) {
		IpdTransferDialogState.admissionId = row.admissionId;
		IpdTransferDialogState.branchId = row.branchId;
		IpdTransferDialogState.fromWardId = row.wardId;
		IpdTransferDialogState.fromBedId = row.bedId;
		const result = await dialogService.open({
			title: 'Transfer bed',
			component: LIpdTransferDialogContent
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDischarge(row: IpdCensusRow) {
		const result = await dialogService.open({
			title: 'Discharge patient',
			message: `Discharge ${row.patientName} (admission ${row.admissionNo ?? row.admissionId})?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed || !censusApi) return;
		try {
			const res = await fetch(censusApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'discharge',
					admissionId: row.admissionId
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				'Discharged — continue to pharmacy / IP billing',
				StatusColorEnum.SUCCESS
			);
			VisitState.select({
				visitId: row.visitId,
				patientName: row.patientName ?? ''
			});
			await goto(
				`/medora/hospital/${hospitalId}/home/billing/ip-billing?visitId=${row.visitId}`
			);
			fetchRows();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Discharge failed',
				StatusColorEnum.ERROR
			);
		}
	}

	function openNursingChart(row: IpdCensusRow) {
		if (!hospitalId) return;
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName ?? ''
		});
		const qs = new URLSearchParams({
			visitId: String(row.visitId),
			visitType: String(VisitTypeEnum.IPD),
			visitStatus: 'admitted'
		});
		void goto(
			buildIpdNursingEmrUrl({
				hospitalId,
				emrChild: 'vital',
				search: `?${qs}`
			})
		);
	}

	function openDoctorEmr(row: IpdCensusRow) {
		if (!hospitalId) return;
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName ?? ''
		});
		void goto(
			buildConsultationEmrUrl({
				hospitalId,
				visitId: row.visitId
			})
		);
	}

	function openDischargeSummary(row: IpdCensusRow) {
		if (!hospitalId) return;
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName ?? ''
		});
		void goto(
			`/medora/hospital/${hospitalId}/home/consultation/discharge-summary?visitId=${row.visitId}`
		);
	}

	function openPharmacy(row: IpdCensusRow) {
		if (!hospitalId) return;
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName ?? ''
		});
		void goto(
			`/medora/hospital/${hospitalId}/home/medication-order/internal-sales?visitId=${row.visitId}`
		);
	}

	lifeCycleUtil.onMount(() => {
		loadWards();
		fetchRows();
	});
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-end gap-3">
		<div class="w-56">
			<label class="label-ink mb-1 block text-sm" for="census-ward"
				>Ward</label
			>
			<WashSelect
				id="census-ward"
				placeholder="All wards"
				options={wardOptions}
				bind:value={wardFilter}
				onChange={() => {
					currentPage = 1;
					fetchRows();
				}}
			/>
		</div>
		<div class="w-64">
			<label class="label-ink mb-1 block text-sm" for="census-search"
				>Search</label
			>
			<input
				id="census-search"
				class="input input-bordered w-full border-ink-border"
				placeholder="Patient / visit / admission"
				bind:value={search}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						currentPage = 1;
						fetchRows();
					}
				}}
			/>
		</div>
		<WashButton
			className="btn-primary"
			onClick={() => {
				currentPage = 1;
				fetchRows();
			}}
		>
			Search
		</WashButton>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MenziesTable
			title="IPD Census"
			{rows}
			{columns}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			emptyMessage="No admitted patients"
			showRowActions={true}
			actionsHeader="Actions"
			actionsVariant="none"
			enableColumnFilters={false}
			on:refresh={() => fetchRows()}
			on:pageSizeChange={() => {
				currentPage = 1;
				fetchRows();
			}}
			on:pageChange={() => fetchRows()}
		>
			{#snippet rowActions(row)}
				<div class="flex flex-wrap gap-1">
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => openNursingChart(row)}
					>
						Nursing chart
					</WashButton>
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => openDoctorEmr(row)}
					>
						Doctor EMR
					</WashButton>
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => openDischargeSummary(row)}
					>
						Discharge summary
					</WashButton>
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => openPharmacy(row)}
					>
						Pharmacy
					</WashButton>
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => openTransfer(row)}
					>
						Transfer
					</WashButton>
					<WashButton
						className="btn-ghost btn-xs"
						onClick={() => handleDischarge(row)}
					>
						Discharge
					</WashButton>
				</div>
			{/snippet}
		</MenziesTable>
	</div>
	{#if totalPages > 1}
		<div class="flex justify-center gap-2">
			<WashButton
				className="btn-sm"
				disabled={currentPage <= 1}
				onClick={() => {
					currentPage -= 1;
					fetchRows();
				}}
			>
				Previous
			</WashButton>
			<span class="flex items-center px-2"
				>Page {currentPage} of {totalPages}</span
			>
			<WashButton
				className="btn-sm"
				disabled={currentPage >= totalPages}
				onClick={() => {
					currentPage += 1;
					fetchRows();
				}}
			>
				Next
			</WashButton>
		</div>
	{/if}
</div>
