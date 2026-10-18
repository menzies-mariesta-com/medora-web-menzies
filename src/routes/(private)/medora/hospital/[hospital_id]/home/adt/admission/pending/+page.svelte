<script lang="ts">
	import { page } from '$app/state';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		IpdAdmissionCareLevelEnum,
		IpdAdmissionOrderStatusTaggingEnum,
		IpdAdmissionUrgencyEnum
	} from '$lib/model/enum/db-link';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { IpdAdmissionOrderRow } from '$lib/model/type/medora/ipd/ipd.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission-order`
			: ''
	);

	let rows = $state<IpdAdmissionOrderRow[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function careLevelLabel(id: number) {
		if (id === IpdAdmissionCareLevelEnum.GENERAL) return 'General';
		if (id === IpdAdmissionCareLevelEnum.SEMI_PRIVATE)
			return 'Semi-Private';
		if (id === IpdAdmissionCareLevelEnum.PRIVATE) return 'Private';
		return String(id);
	}
	function urgencyLabel(id: number) {
		if (id === IpdAdmissionUrgencyEnum.ROUTINE) return 'Routine';
		if (id === IpdAdmissionUrgencyEnum.URGENT) return 'Urgent';
		return String(id);
	}

	const columns: MenziesTableColumn<IpdAdmissionOrderRow>[] = [
		{
			id: 'patientName',
			header: 'Patient',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: true,
			format: (_v, row) =>
				row.patientCode
					? `${row.patientName} (${row.patientCode})`
					: row.patientName
		},
		{
			id: 'sourceOpdVisitNo',
			header: 'OPD Visit',
			widthClass: 'w-40 min-w-[10rem]',
			field: 'sourceOpdVisitNo',
			filterable: true
		},
		{
			id: 'orderingDoctorName',
			header: 'Ordered by',
			widthClass: 'w-40 min-w-[10rem]',
			field: 'orderingDoctorName',
			filterable: false
		},
		{
			id: 'careLevel',
			header: 'Care level',
			widthClass: 'w-32',
			format: (_v, row) => careLevelLabel(row.careLevel)
		},
		{
			id: 'urgency',
			header: 'Urgency',
			widthClass: 'w-28',
			format: (_v, row) => urgencyLabel(row.urgency)
		},
		{
			id: 'preferredWardName',
			header: 'Preferred ward',
			widthClass: 'w-36',
			field: 'preferredWardName',
			filterable: false
		},
		{
			id: 'createdAt',
			header: 'Ordered',
			widthClass: 'w-40',
			format: (_v, row) =>
				row.createdAt
					? new Date(row.createdAt).toLocaleString()
					: '—'
		}
	];

	async function fetchRows() {
		if (!api) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams({
				page: String(currentPage),
				pageSize: String(Number(pageSizeStr) || 10),
				statusTaggingId: String(
					IpdAdmissionOrderStatusTaggingEnum.PENDING
				)
			});
			const searchBits = [
				tableFilters.patientName,
				tableFilters.sourceOpdVisitNo
			]
				.map((s) => s?.trim())
				.filter(Boolean);
			if (searchBits.length) qs.set('search', searchBits.join(' '));
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			const result =
				(await res.json()) as PaginatedResult<IpdAdmissionOrderRow>;
			rows = result.data ?? [];
			total = result.total ?? 0;
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Load failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function handleCancel(row: IpdAdmissionOrderRow) {
		if (!api) return;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ action: 'cancel', id: row.id })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast('Order cancelled', StatusColorEnum.SUCCESS);
			fetchRows();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Cancel failed',
				StatusColorEnum.ERROR
			);
		}
	}

	function handleAdmit(row: IpdAdmissionOrderRow) {
		if (!hospitalId) return;
		const url = medoraHospitalPageUrl(
			hospitalId,
			WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_NEW
		);
		routerUtil.goToRoute(
			`${url}?orderId=${encodeURIComponent(String(row.id))}`
		);
	}

	lifeCycleUtil.onMount(() => {
		fetchRows();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});
</script>

<div class={TableEnum.HEIGHT}>
	<MenziesTable
		title="Pending Admissions"
		{rows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		emptyMessage="No pending admission orders"
		showRowActions={true}
		actionsHeader="Actions"
		actionsVariant="none"
		enableColumnFilters={true}
		on:refresh={() => fetchRows()}
		on:pageSizeChange={() => {
			currentPage = 1;
			fetchRows();
		}}
		on:pageChange={() => fetchRows()}
		on:filtersChange={(event) => {
			if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
			tableFilters = event.detail.filters;
			currentPage = 1;
			filterDebounceTimeout = setTimeout(() => {
				fetchRows();
			}, 350);
		}}
	>
		{#snippet rowActions(row)}
			{#if row.statusTaggingId === IpdAdmissionOrderStatusTaggingEnum.PENDING}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText="Admit"
						color="primary"
						onClick={() => handleAdmit(row)}
					>
						{#snippet icon()}
							<LucideCircleCheck className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>
					<MenziesTableIconAction
						tooltipText="Cancel"
						color="error"
						onClick={() => void handleCancel(row)}
					>
						{#snippet icon()}
							<LucideBan className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>
				</MenziesTableRowActionGroup>
			{/if}
		{/snippet}
	</MenziesTable>
</div>
