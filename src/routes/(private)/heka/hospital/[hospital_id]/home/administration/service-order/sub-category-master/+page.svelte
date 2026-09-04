<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		CategoryListRow,
		SubCategoryListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import { SubCategoryModalState } from '$lib/state/sub-category-modal.state.svelte';
	import SubCategoryFormModal from '$lib/component/own/local/private/heka/administration/category/SubCategoryFormModal.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import MariTableEditDeleteActions from '$lib/component/own/library/mari/table/MariTableEditDeleteActions.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';

	const toastService = new ToastService();

	let { data } = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	/** Data is always fetched at hospital level (no branch filter). */

	let subCategoryResult =
		$state<PaginatedResult<SubCategoryListRow> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let categories = $state<CategoryListRow[]>([]);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const subCategories = $derived(subCategoryResult?.data ?? []);
	const total = $derived(subCategoryResult?.total ?? 0);

	async function fetchJson<T>(
		input: string,
		init?: RequestInit
	): Promise<T> {
		const res = await fetch(input, {
			...init,
			headers: {
				...(init?.headers ?? {}),
				'content-type': 'application/json'
			}
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function fetchCategories() {
		if (!hospitalId) return;
		categories = await fetchJson<CategoryListRow[]>(
			`/api/heka/hospital/${hospitalId}/home/administration/service-order/category-master?mode=all`
		);
	}

	async function fetchSubCategories(forceRefresh = false) {
		void forceRefresh;
		isLoading = true;
		try {
			if (!hospitalId) return;
			const pageSize = Number(pageSizeStr) || 10;
			let categoryIds = categories.map((c) => c.id);
			const categoryTerm = tableFilters.category
				?.trim()
				.toLowerCase();
			if (categoryTerm) {
				const matchedCategoryIds = categories
					.filter((c) =>
						(c.categoryName ?? '')
							.toLowerCase()
							.includes(categoryTerm)
					)
					.map((c) => c.id);
				categoryIds = categoryIds.filter((id) =>
					matchedCategoryIds.includes(id)
				);
			}

			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const parsedId = tableFilters.id
				? Number(tableFilters.id)
				: undefined;
			const params = {
				page: currentPage,
				pageSize,
				categoryIds,
				id:
					parsedId != null && Number.isFinite(parsedId)
						? parsedId
						: undefined,
				subCategoryName:
					tableFilters.subCategoryName?.trim() || undefined,
				statusId:
					parsedStatusId != null && Number.isFinite(parsedStatusId)
						? parsedStatusId
						: undefined
			};

			const qs = new URLSearchParams();
			qs.set('page', String(params.page));
			qs.set('pageSize', String(params.pageSize));
			qs.set('categoryIds', categoryIds.join(','));
			if (params.id != null) qs.set('id', String(params.id));
			if (params.subCategoryName)
				qs.set('subCategoryName', params.subCategoryName);
			if (params.statusId != null)
				qs.set('statusId', String(params.statusId));

			subCategoryResult = await fetchJson<
				PaginatedResult<SubCategoryListRow>
			>(
				`/api/heka/hospital/${hospitalId}/home/administration/service-order/sub-category-master?${qs.toString()}`
			);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (!hospitalId) return;
		fetchCategories().then(() => fetchSubCategories(true));
	});

	async function openCreate() {
		SubCategoryModalState.mode = 'create';
		SubCategoryModalState.editRow = null;
		SubCategoryModalState.defaultCategoryId = null;
		SubCategoryModalState.categoryOptions = categories;
		const result = await dialogService.open({
			title: 'New sub-category',
			component: SubCategoryFormModal
		});
		if (result.confirmed) {
			fetchSubCategories(true);
			fetchCategories();
		}
	}

	async function openEdit(row: SubCategoryListRow) {
		SubCategoryModalState.mode = 'edit';
		SubCategoryModalState.editRow = row;
		SubCategoryModalState.defaultCategoryId = null;
		SubCategoryModalState.categoryOptions = categories;
		const result = await dialogService.open({
			title: 'Edit sub-category',
			component: SubCategoryFormModal
		});
		if (result.confirmed) {
			fetchSubCategories(true);
		}
	}

	async function handleDelete(row: SubCategoryListRow) {
		const result = await dialogService.open({
			title: 'Delete sub-category',
			message: `Delete "${row.subCategoryName ?? 'this sub-category'}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			if (!hospitalId) throw new Error('Missing hospital context');
			await fetchJson<{ ok: true }>(
				`/api/heka/hospital/${hospitalId}/home/administration/service-order/sub-category-master`,
				{
					method: 'DELETE',
					body: JSON.stringify({ id: row.id })
				}
			);
			toastSuccess(
				toastService,
				m.entity_sub_category(),
				m.toast_action_deleted()
			);
			fetchSubCategories(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function categoryNameById(id: number): string {
		const cat = categories.find((c) => c.id === id);
		return cat?.categoryName ?? `#${id}`;
	}

	const subCategoryColumns: MariTableColumn<SubCategoryListRow>[] = [
		{
			id: 'id',
			header: 'No.',
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false,
			format: (_value, _row, rowIndex) => {
				const pageSize = Number(pageSizeStr) || 10;
				return (currentPage - 1) * pageSize + rowIndex + 1;
			}
		},
		{
			id: 'category',
			header: 'Category',
			widthClass: 'w-64 min-w-[12rem]',
			format: (_value, row) => categoryNameById(row.categoryId)
		},
		{
			id: 'subCategoryName',
			header: 'Sub-category',
			widthClass: 'w-64 min-w-[12rem]',
			field: 'subCategoryName'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];
</script>

<div class="space-y-6">
	<div class="mb-2 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{m.sub_category_master()}</h1>
		<DaisyUiButton
			className="d-btn-primary d-btn-sm"
			onClick={openCreate}
		>
			<LucidePlus />
			{m.create()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={subCategories}
					columns={subCategoryColumns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage="No sub-categories. Create one."
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					enableColumnFilters={true}
					useRemoteFilters={true}
					on:refresh={() => fetchSubCategories(true)}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchSubCategories(true);
					}}
					on:pageChange={() => fetchSubCategories(true)}
					on:filtersChange={(event) => {
						if (filterDebounceTimeout) {
							clearTimeout(filterDebounceTimeout);
						}
						tableFilters = event.detail.filters;
						currentPage = 1;
						filterDebounceTimeout = setTimeout(() => {
							fetchSubCategories(true);
						}, 350);
					}}
				>
					{#snippet rowActions(row, rowIndex)}
						<MariTableEditDeleteActions
							onEdit={() => openEdit(row as SubCategoryListRow)}
							onDelete={() => handleDelete(row as SubCategoryListRow)}
						/>
					{/snippet}
				</MariTable>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
