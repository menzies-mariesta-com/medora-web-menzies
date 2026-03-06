<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import {
		getSubCategoryPaginated,
		deleteSubCategory,
		type SubCategorySchema
	} from '$lib/remote/table/information-table/sub-category.remote';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import { getCategory } from '$lib/remote/table/information-table/category.remote';
	import type { CategorySchema } from '$lib/server/db/schema-type';
	import { SubCategoryModalState } from '$lib/state/sub-category-modal.state.svelte';
	import SubCategoryFormModal from '$lib/component/local/private/heka/administration/category/SubCategoryFormModal.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

		const toastService = new ToastService();

	let { data } = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	/** User's current branch from layout; filters categories to this branch. "__all__" means show all branches. */
	const selectedBranchId = $derived(data?.selectedBranchId ?? null);
	const branchIdForCategory = $derived(
		selectedBranchId && selectedBranchId !== '__all__'
			? selectedBranchId
			: null
	);

	let subCategoryResult = $state<PaginatedResult<SubCategorySchema> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let categories = $state<CategorySchema[]>([]);
	let selectedCategoryId = $state<string>('');
	let isLoading = $state(false);

	const subCategories = $derived(subCategoryResult?.data ?? []);
	const total = $derived(subCategoryResult?.total ?? 0);

	async function fetchCategories() {
		if (!hospitalId) return;
		categories = await getCategory({
			hospitalId,
			branchId: branchIdForCategory
		});
	}

	async function fetchSubCategories(forceRefresh = false) {
		isLoading = true;
		try {
			const categoryId = selectedCategoryId
				? Number(selectedCategoryId)
				: null;
			const pageSize = Number(pageSizeStr) || 10;
			const params = {
				page: currentPage,
				pageSize,
				categoryId: categoryId ?? undefined
			};
			if (forceRefresh) {
				await getSubCategoryPaginated(params).refresh();
			}
			subCategoryResult = await getSubCategoryPaginated(params);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const _branch = selectedBranchId;
		const _hospital = hospitalId;
		if (!_hospital) return;
		fetchCategories().then(() => fetchSubCategories(true));
	});

	function onCategoryFilterChange() {
		currentPage = 1;
		fetchSubCategories(true);
	}

	async function openCreate() {
		SubCategoryModalState.mode = 'create';
		SubCategoryModalState.editRow = null;
		SubCategoryModalState.defaultCategoryId = selectedCategoryId
			? Number(selectedCategoryId)
			: null;
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

	async function openEdit(row: SubCategorySchema) {
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

	async function handleDelete(row: SubCategorySchema) {
		const result = await dialogService.open({
			title: 'Delete sub-category',
			message: `Delete "${row.subCategoryName ?? 'this sub-category'}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteSubCategory({ id: row.id });
			toastService.addToast(
				'Sub-category deleted.',
				StatusColorEnum.SUCCESS
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

	const subCategoryColumns: MariTableColumn<SubCategorySchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
		},
		{
			id: 'category',
			header: 'Category',
			widthClass: 'w-64 min-w-[12rem]',
			filterable: false,
			format: (_value, row) => categoryNameById(row.categoryId)
		},
		{
			id: 'subCategoryName',
			header: 'Sub-category',
			widthClass: 'w-64 min-w-[12rem]',
			filterable: false,
			field: 'subCategoryName'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_value, row) =>
				row.statusId === 1 ? 'Active' : 'Inactive'
		}
	];
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Sub-categories</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			New sub-category
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class="mb-4 flex flex-wrap items-center gap-4">
				<label class="flex items-center gap-2">
					<span class="text-sm">Filter by category</span>
					<DaisyUiSelect
						className="d-select d-select-bordered d-select-sm w-64"
						bind:value={selectedCategoryId}
						onChange={onCategoryFilterChange}
						optionHeader="All categories"
					>
						{#each categories as cat (cat.id)}
							<option value={cat.id}
								>{cat.categoryName ?? `Category ${cat.id}`}</option
							>
						{/each}
					</DaisyUiSelect>
				</label>
			</div>

			{#if isLoading && subCategories.length === 0}
				<DaisyUiLoading className="py-8" />
			{:else}
				<div class="{TableEnum.HEIGHT}">
					<MariTable
						rows={subCategories}
						columns={subCategoryColumns}
						isLoading={isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage={currentPage}
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage="No sub-categories. Create one or change the filter."
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						enableColumnFilters={false}
						useRemoteFilters={true}
						on:refresh={() => fetchSubCategories(true)}
						on:pageSizeChange={() => {
							currentPage = 1;
							fetchSubCategories(true);
						}}
						on:pageChange={() => fetchSubCategories(true)}
					>
					<svelte:fragment slot="rowActions" let:row>
						<td class="text-right">
							<div class="flex justify-end gap-2">
								<DaisyUiButton
									className="d-btn-ghost d-btn-sm"
									onClick={() => openEdit(row)}
								>
									<LucidePencil />
								</DaisyUiButton>
								<DaisyUiButton
									className="d-btn-ghost d-btn-error d-btn-sm"
									onClick={() => handleDelete(row)}
								>
									<LucideTrash2 />
								</DaisyUiButton>
							</div>
						</td>
					</svelte:fragment>
				</MariTable>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
