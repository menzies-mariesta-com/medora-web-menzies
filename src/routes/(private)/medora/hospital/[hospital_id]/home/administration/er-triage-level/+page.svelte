<script lang="ts">
	import { page } from '$app/state';
	import EdTriageLevelFormModal from '$lib/component/own/local/private/medora/administration/er-triage-level/EdTriageLevelFormModal.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { EdTriageLevelRow } from '$lib/model/type/medora/er/er.type';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { EdTriageLevelModalState } from '$lib/state/ed-triage-level-modal.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const triageApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/er-triage-level`
			: ''
	);

	let rows = $state<EdTriageLevelRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

	const columns: MenziesTableColumn<EdTriageLevelRow>[] = [
		{
			id: 'level',
			header: msg.ed_triage_level_col_level?.() ?? 'Level',
			widthClass: 'w-20 min-w-[4rem]',
			filterable: false,
			format: (_v, row) => String(row.level)
		},
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-56 min-w-[12rem]',
			filterable: true,
			field: 'name'
		},
		{
			id: 'color',
			header: msg.ed_triage_level_col_color?.() ?? 'Color',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_v, row) => row.color
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_v, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];

	async function fetchRows() {
		if (!triageApi) return;
		isLoading = true;
		try {
			const query = new SvelteURLSearchParams({
				page: String(currentPage),
				pageSize: String(Number(pageSizeStr) || 10)
			});
			const name = tableFilters.name?.trim();
			const statusId = Number(tableFilters.status);
			if (name) query.set('name', name);
			if (Number.isFinite(statusId) && statusId > 0) {
				query.set('statusId', String(statusId));
			}
			const response = await fetch(`${triageApi}?${query}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Load failed (${response.status})`);
			}
			const result = (await response.json()) as {
				data: EdTriageLevelRow[];
				total: number;
				totalPages: number;
			};
			rows = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} catch (error) {
			toastService.addToast(
				error instanceof Error ? error.message : 'Unable to load',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(fetchRows);

	async function openCreate() {
		EdTriageLevelModalState.openCreate();
		const result = await dialogService.open({
			title: msg.ed_triage_level_new?.() ?? 'New triage level',
			component: EdTriageLevelFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: EdTriageLevelRow) {
		EdTriageLevelModalState.openEdit(row);
		const result = await dialogService.open({
			title: msg.ed_triage_level_edit?.() ?? 'Edit triage level',
			component: EdTriageLevelFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: EdTriageLevelRow) {
		const result = await dialogService.open({
			title: msg.ed_triage_level_delete_title?.() ?? 'Delete triage level',
			message:
				msg.ed_triage_level_delete_message?.({
					name: row.name
				}) ?? `Delete level ${row.level} (${row.name})?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed || !triageApi) return;
		try {
			const response = await fetch(
				`${triageApi}?id=${encodeURIComponent(String(row.id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Delete failed (${response.status})`);
			}
			toastService.addToast(
				msg.ed_triage_level_deleted?.() ?? 'Triage level deleted',
				StatusColorEnum.SUCCESS
			);
			fetchRows();
		} catch (error) {
			toastService.addToast(
				error instanceof Error ? error.message : 'Delete failed',
				StatusColorEnum.ERROR
			);
		}
	}

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
	});
</script>

<div class={TableEnum.HEIGHT}>
	<MenziesTable
		title={msg.ed_triage_level_title?.() ?? 'ER triage levels'}
		description={msg.ed_triage_level_desc?.() ??
			'Hospital triage levels 1-5 used at ED registration.'}
		{rows}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={total}
		showRefreshButton={true}
		showRowActions={true}
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
			filterDebounceTimeout = setTimeout(() => fetchRows(), 350);
		}}
	>
		{#snippet headerActions()}
			<WashButton
				type="button"
				className="btn btn-primary btn-sm cursor-pointer"
				onClick={() => void openCreate()}
			>
				{msg.ed_triage_level_new?.() ?? 'New level'}
			</WashButton>
		{/snippet}
		{#snippet rowActions(row)}
			<MenziesTableEditDeleteActions
				onEdit={() => void openEdit(row)}
				onDelete={() => void handleDelete(row)}
			/>
		{/snippet}
	</MenziesTable>
</div>
