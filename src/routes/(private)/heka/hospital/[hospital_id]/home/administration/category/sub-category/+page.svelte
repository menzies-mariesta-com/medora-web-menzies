<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import {
		getSubCategory,
		deleteSubCategory,
		type SubCategorySchema
	} from '$lib/remote/table/information-table/sub-category.remote';
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

	let subCategories = $state<SubCategorySchema[]>([]);
	let categories = $state<CategorySchema[]>([]);
	let selectedCategoryId = $state<string>('');
	let isLoading = $state(false);

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
			if (forceRefresh) {
				await getSubCategory({
					categoryId: categoryId ?? undefined
				}).refresh();
			}
			subCategories = await getSubCategory({
				categoryId: categoryId ?? undefined
			});
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
				<p class="mb-4 text-base-content/70">
					{#if subCategories.length > 0}
						{m.showing()}
						{subCategories.length} sub-categor{subCategories.length ===
						1
							? 'y'
							: 'ies'}
					{:else}
						No sub-categories yet. Create one above or select a
						category.
					{/if}
				</p>
				<DaisyUiTable>
					<DaisyUiTableHeader>
						<tr>
							<th>{m.id()}</th>
							<th>Category</th>
							<th>{m.name()}</th>
							<th>{m.status()}</th>
							<th class="text-right">{m.actions()}</th>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each subCategories as row (row.id)}
							<tr>
								<td>{row.id}</td>
								<td>{categoryNameById(row.categoryId)}</td>
								<td>{row.subCategoryName ?? '—'}</td>
								<td>{row.statusId === 1 ? 'Active' : 'Inactive'}</td>
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
							</tr>
						{:else}
							<tr>
								<td
									colspan={5}
									class="text-center text-base-content/70 py-8"
								>
									No sub-categories. Create one or change the filter.
								</td>
							</tr>
						{/each}
					</DaisyUiTableBody>
				</DaisyUiTable>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
