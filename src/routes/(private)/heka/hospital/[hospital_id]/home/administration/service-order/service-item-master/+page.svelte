<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		getServiceItemPaginated,
		createServiceItem,
		updateServiceItem,
		deleteServiceItem
	} from '$lib/remote/table/information-table/service-item.remote';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import { getCategory } from '$lib/remote/table/information-table/category.remote';
	import { getSubCategory } from '$lib/remote/table/information-table/sub-category.remote';
	import type {
		CategorySchema,
		SubCategorySchema,
		ServiceItemSchema
	} from '$lib/server/db/schema-type';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const toastService = new ToastService();

	let { data } = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	/** User's current branch from layout; refetch when branch changes. */
	const selectedBranchId = $derived(data?.selectedBranchId ?? null);
	const branchIdForCategory = $derived(
		selectedBranchId && selectedBranchId !== '__all__'
			? selectedBranchId
			: null
	);

	let categories = $state<CategorySchema[]>([]);
	let subCategories = $state<SubCategorySchema[]>([]);
	let serviceResult =
		$state<PaginatedResult<ServiceItemSchema> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const serviceItems = $derived(serviceResult?.data ?? []);
	const total = $derived(serviceResult?.total ?? 0);

	let selectedCategoryId = $state<string>('');
	let selectedSubCategoryId = $state<string>('');

	const filteredSubCategories = $derived.by(() => {
		if (!selectedCategoryId) return subCategories;
		const categoryId = Number(selectedCategoryId);
		if (Number.isNaN(categoryId)) return subCategories;
		return subCategories.filter((sc) => sc.categoryId === categoryId);
	});

	let formServiceName = $state('');
	let formServiceCode = $state('');
	let formRemark = $state('');
	let formActive = $state(true);

	type Mode = 'create' | 'edit';
	let mode = $state<Mode>('create');
	let editingId = $state<number | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	let tableColumnFilters = $state<Record<string, string>>({});

	const serviceItemColumns: MariTableColumn<ServiceItemSchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-20'
		},
		{
			id: 'category',
			header: 'Category',
			widthClass: 'w-40',
			format: (_value, row) =>
				categoryNameById(
					row.subCategoryId
						? (subCategories.find((s) => s.id === row.subCategoryId)
								?.categoryId ?? null)
						: null
				)
		},
		{
			id: 'subCategory',
			header: 'Sub-category',
			widthClass: 'w-40',
			format: (_value, row) => subCategoryNameById(row.subCategoryId)
		},
		{
			id: 'serviceName',
			header: m.name(),
			widthClass: 'w-48',
			field: 'serviceName'
		},
		{
			id: 'serviceCode',
			header: 'Code',
			widthClass: 'w-32',
			field: 'serviceCode',
			format: (value) => value ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32',
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

	async function fetchCategories() {
		categories = await getCategory();
	}

	async function fetchSubCategories() {
		// Load all sub-categories for all categories available to this branch
		if (categories.length === 0) {
			subCategories = [];
			selectedSubCategoryId = '';
			return;
		}

		const lists = await Promise.all(
			categories.map((cat) => getSubCategory({ categoryId: cat.id }))
		);

		const byId = new Map<number, SubCategorySchema>();
		for (const list of lists) {
			for (const sc of list) {
				if (!byId.has(sc.id)) {
					byId.set(sc.id, sc);
				}
			}
		}

		subCategories = Array.from(byId.values()).sort((a, b) =>
			(a.subCategoryName ?? '').localeCompare(b.subCategoryName ?? '')
		);

		// Ensure current selection is valid
		if (
			!subCategories.find(
				(s) => String(s.id) === selectedSubCategoryId
			) &&
			subCategories.length > 0
		) {
			selectedSubCategoryId = String(subCategories[0].id);
		}
	}

	async function fetchServiceItems(forceRefresh = false) {
		isLoading = true;
		try {
			const filters = tableColumnFilters;

			const params: {
				hospitalId?: string;
				subCategoryId?: number;
				subCategoryIds?: number[];
				serviceName?: string;
				serviceCode?: string;
				statusId?: number;
				id?: number;
			} = {};

			if (hospitalId) {
				params.hospitalId = hospitalId;
			}

			// ID filter
			const idTerm = filters.id?.trim();
			if (idTerm) {
				const idVal = Number(idTerm);
				if (!Number.isNaN(idVal)) {
					params.id = idVal;
				}
			}

			// Build remote sub-category scope from selected branch and column filters.
			let scopedSubCategoryIds: number[] | undefined;
			if (branchIdForCategory) {
				scopedSubCategoryIds = subCategories.map((sc) => sc.id);
			}

			const categoryTerm = filters.category?.trim().toLowerCase();
			if (categoryTerm) {
				const idsByCategory = subCategories
					.filter((sc) =>
						(
							categories.find((c) => c.id === sc.categoryId)
								?.categoryName ?? ''
						)
							.toLowerCase()
							.includes(categoryTerm)
					)
					.map((sc) => sc.id);
				scopedSubCategoryIds =
					scopedSubCategoryIds == null
						? idsByCategory
						: scopedSubCategoryIds.filter((id) =>
								idsByCategory.includes(id)
							);
			}

			const subCategoryTerm = filters.subCategory
				?.trim()
				.toLowerCase();
			if (subCategoryTerm) {
				const selected = subCategories
					.filter((sc) =>
						(sc.subCategoryName ?? '')
							.toLowerCase()
							.includes(subCategoryTerm)
					)
					.map((sc) => sc.id);
				scopedSubCategoryIds =
					scopedSubCategoryIds == null
						? selected
						: scopedSubCategoryIds.filter((id) =>
								selected.includes(id)
							);
			}

			if (scopedSubCategoryIds) {
				if (scopedSubCategoryIds.length === 0) {
					serviceResult = {
						data: [],
						total: 0,
						page: 1,
						pageSize: Number(pageSizeStr) || 10,
						totalPages: 1
					};
					return;
				}
				if (scopedSubCategoryIds.length === 1) {
					params.subCategoryId = scopedSubCategoryIds[0];
				} else {
					params.subCategoryIds = scopedSubCategoryIds;
				}
			}

			// Service name / code filters
			const nameTerm = filters.serviceName?.trim();
			if (nameTerm) {
				params.serviceName = nameTerm;
			}

			const codeTerm = filters.serviceCode?.trim();
			if (codeTerm) {
				params.serviceCode = codeTerm;
			}

			// Status filter from remote select value
			const statusId = Number(filters.status);
			if (!Number.isNaN(statusId)) {
				params.statusId = statusId;
			}

			const pageSize = Number(pageSizeStr) || 10;
			const paginatedParams = {
				...params,
				page: currentPage,
				pageSize
			};
			if (forceRefresh) {
				await getServiceItemPaginated(paginatedParams).refresh();
			}

			serviceResult = await getServiceItemPaginated(paginatedParams);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const _hospital = hospitalId;
		const _branch = selectedBranchId;
		if (!_hospital) return;
		(async () => {
			await fetchCategories();
			await fetchSubCategories();
			await fetchServiceItems(true);
		})();
	});

	function onCategoryChange() {
		const available = filteredSubCategories;
		if (
			!available.find((sc) => String(sc.id) === selectedSubCategoryId)
		) {
			selectedSubCategoryId =
				available.length > 0 ? String(available[0].id) : '';
		}
	}

	async function onSubCategoryChange() {
		await fetchServiceItems(true);
	}

	function resetForm() {
		formServiceName = '';
		formServiceCode = '';
		formRemark = '';
		formActive = true;
		mode = 'create';
		editingId = null;
	}

	function startCreate() {
		resetForm();
	}

	function startEdit(row: ServiceItemSchema) {
		mode = 'edit';
		editingId = row.id;
		selectedSubCategoryId =
			row.subCategoryId != null ? String(row.subCategoryId) : '';
		formServiceName = row.serviceName ?? '';
		formServiceCode = row.serviceCode ?? '';
		formRemark = row.remark ?? '';
		formActive =
			(row.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
	}

	function handleTableFiltersChange(
		event: CustomEvent<{ filters: Record<string, string> }>
	) {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
		tableColumnFilters = event.detail.filters;
		currentPage = 1;
		filterDebounceTimeout = setTimeout(() => {
			fetchServiceItems(true);
		}, 350);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!hospitalId) {
			toastService.addToast(
				'Hospital context is missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const subCategoryId = selectedSubCategoryId
			? Number(selectedSubCategoryId)
			: null;
		if (!subCategoryId) {
			toastService.addToast(
				'Please select category and sub-category.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const name = formServiceName.trim();
		if (!name) {
			toastService.addToast(
				'Service name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const code = formServiceCode.trim();

		// Prevent duplicate service name within this hospital
		const normalizedName = name.toLowerCase();
		const duplicateByName = serviceItems.find(
			(item) =>
				item.id !== editingId &&
				(item.serviceName ?? '').trim().toLowerCase() ===
					normalizedName
		);
		if (duplicateByName) {
			toastService.addToast(
				'Service name already exists.',
				StatusColorEnum.ERROR
			);
			return;
		}

		// Prevent duplicate service code within this hospital
		if (code) {
			const normalizedCode = code.toLowerCase();
			const duplicateByCode = serviceItems.find(
				(item) =>
					item.id !== editingId &&
					(item.serviceCode ?? '').trim().toLowerCase() ===
						normalizedCode
			);
			if (duplicateByCode) {
				toastService.addToast(
					'Service code already exists.',
					StatusColorEnum.ERROR
				);
				return;
			}
		}

		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		isSaving = true;
		try {
			if (mode === 'create') {
				await createServiceItem({
					hospitalId,
					subCategoryId,
					serviceName: name,
					serviceCode: code || null,
					remark: formRemark.trim() || null,
					statusId
				});
				toastService.addToast(
					'Service item created.',
					StatusColorEnum.SUCCESS
				);
			} else if (mode === 'edit' && editingId != null) {
				await updateServiceItem({
					id: editingId,
					serviceName: name,
					serviceCode: code || null,
					remark: formRemark.trim() || null,
					statusId
				});
				toastService.addToast(
					'Service item updated.',
					StatusColorEnum.SUCCESS
				);
			}
			await fetchServiceItems(true);
			if (mode === 'create') resetForm();
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Failed to save service item.';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(row: ServiceItemSchema) {
		const result = await dialogService.open({
			title: 'Delete service item',
			message: `Delete "${row.serviceName ?? 'this service item'}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceItem({ id: row.id });
			toastService.addToast(
				'Service item deleted.',
				StatusColorEnum.SUCCESS
			);
			await fetchServiceItems(true);
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Failed to delete service item.';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function categoryNameById(id: number | null | undefined): string {
		if (id == null) return '—';
		const cat = categories.find((c) => c.id === id);
		return cat?.categoryName ?? `#${id}`;
	}

	function subCategoryNameById(
		id: number | null | undefined
	): string {
		if (id == null) return '—';
		const sc = subCategories.find((s) => s.id === id);
		return sc?.subCategoryName ?? `#${id}`;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Service items</h1>
		<DaisyUiButton
			className="d-btn-outline d-btn-sm d-btn-square"
			onClick={startCreate}
		>
			<LucidePlus />
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
				<div class="flex flex-wrap gap-4">
					<div class="flex min-w-52 flex-1 flex-col gap-1">
						<label class="text-sm font-medium">Category</label>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full"
							bind:value={selectedCategoryId}
							onChange={onCategoryChange}
							optionHeader="All categories"
						>
							{#each categories as cat (cat.id)}
								<option value={String(cat.id)}
									>{cat.categoryName ?? `Category ${cat.id}`}</option
								>
							{/each}
						</DaisyUiSelect>
					</div>
					<div class="flex min-w-52 flex-1 flex-col gap-1">
						<label class="text-sm font-medium">Sub-category</label>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-full"
							bind:value={selectedSubCategoryId}
							onChange={onSubCategoryChange}
							optionHeader="Select sub-category"
						>
							{#each filteredSubCategories as sc (sc.id)}
								<option value={String(sc.id)}
									>{sc.subCategoryName ??
										`Sub-category ${sc.id}`}</option
								>
							{/each}
						</DaisyUiSelect>
					</div>
					<div class="flex min-w-52 flex-1 flex-col gap-1">
						<label class="text-sm font-medium">
							Service name<span class="text-error"> *</span>
						</label>
						<DaisyUiInputField
							bind:value={formServiceName}
							inputType="text"
							inputPlaceholderText="Service name"
							required
							className="d-input-sm w-full"
						/>
					</div>
					<div class="flex min-w-40 flex-1 flex-col gap-1">
						<label class="text-sm font-medium">Service code</label>
						<DaisyUiInputField
							bind:value={formServiceCode}
							inputType="text"
							inputPlaceholderText="Code (optional)"
							className="d-input-sm w-full"
						/>
					</div>
				</div>

				<div class="flex flex-wrap gap-4">
					<div class="flex min-w-56 flex-1 flex-col gap-1">
						<label class="text-sm font-medium">Remark</label>
						<DaisyUiTextarea
							bind:value={formRemark}
							placeholder="Remark (optional)"
							className="h-24 w-full"
						/>
					</div>
					<div class="flex items-end gap-2">
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								bind:checked={formActive}
								class="d-checkbox d-checkbox-sm"
							/>
							<span>Active</span>
						</label>
					</div>
				</div>

				<div
					class="flex justify-end gap-2 border-t border-base-300 pt-4"
				>
					<DaisyUiButton
						type="button"
						className="d-btn-ghost d-btn-sm"
						onClick={resetForm}
					>
						{m.cancel()}
					</DaisyUiButton>
					<DaisyUiButton
						type="submit"
						className="d-btn-primary d-btn-sm"
						disabled={isSaving}
					>
						{isSaving
							? 'Saving…'
							: mode === 'create'
								? 'Create'
								: 'Save'}
					</DaisyUiButton>
				</div>
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={serviceItems}
					columns={serviceItemColumns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					emptyMessage="No records found"
					enableColumnFilters={true}
					useRemoteFilters={true}
					actionsHeader={m.actions()}
					actionsVariant="crud"
					on:refresh={() => fetchServiceItems(true)}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchServiceItems(true);
					}}
					on:pageChange={() => fetchServiceItems(true)}
					on:filtersChange={handleTableFiltersChange}
					on:edit={(event) => startEdit(event.detail)}
					on:delete={(event) => handleDelete(event.detail)}
				/>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
