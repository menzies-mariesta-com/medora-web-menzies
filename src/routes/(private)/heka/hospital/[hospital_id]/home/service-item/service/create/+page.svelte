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
	import {
		getServiceItem,
		createServiceItem,
		updateServiceItem,
		deleteServiceItem,
		type ServiceItemSchema
	} from '$lib/remote/table/information-table/service-item.remote';
	import { getCategory } from '$lib/remote/table/information-table/category.remote';
	import { getSubCategory } from '$lib/remote/table/information-table/sub-category.remote';
	import type { CategorySchema, SubCategorySchema } from '$lib/server/db/schema-type';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	let { data } = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id ? page.params.hospital_id : ''
	);
	/** User's current branch from layout; used to scope categories; \"__all__\" means all branches. */
	const selectedBranchId = $derived(data?.selectedBranchId ?? null);
	const branchIdForCategory = $derived(
		selectedBranchId && selectedBranchId !== '__all__' ? selectedBranchId : null
	);

	let categories = $state<CategorySchema[]>([]);
	let subCategories = $state<SubCategorySchema[]>([]);
	let serviceItems = $state<ServiceItemSchema[]>([]);

	let selectedCategoryId = $state<string>('');
	let selectedSubCategoryId = $state<string>('');

	let formServiceName = $state('');
	let formServiceCode = $state('');
	let formRemark = $state('');
	let formActive = $state(true);

	type Mode = 'create' | 'edit';
	let mode = $state<Mode>('create');
	let editingId = $state<number | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	async function fetchCategories() {
		if (!hospitalId) return;
		categories = await getCategory({ hospitalId, branchId: branchIdForCategory });
	}

	async function fetchSubCategories() {
		const categoryId = selectedCategoryId ? Number(selectedCategoryId) : null;
		if (!categoryId) {
			subCategories = [];
			selectedSubCategoryId = '';
			return;
		}
		subCategories = await getSubCategory({ categoryId });
		// If current selected sub-category doesn't belong to this category, reset it
		if (!subCategories.find((s) => String(s.id) === selectedSubCategoryId) && subCategories.length > 0) {
			selectedSubCategoryId = String(subCategories[0].id);
		}
	}

	async function fetchServiceItems(forceRefresh = false) {
		isLoading = true;
		try {
			const subCategoryId = selectedSubCategoryId ? Number(selectedSubCategoryId) : null;
			const params =
				hospitalId || subCategoryId != null
					? { hospitalId, subCategoryId: subCategoryId ?? undefined }
					: undefined;
			if (forceRefresh && params) {
				await getServiceItem(params).refresh();
			}
			serviceItems = await getServiceItem(params);
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

	async function onCategoryChange() {
		await fetchSubCategories();
		await fetchServiceItems(true);
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
		formServiceName = row.serviceName ?? '';
		formServiceCode = row.serviceCode ?? '';
		formRemark = row.remark ?? '';
		formActive = (row.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!hospitalId) {
			toastService.addToast('Hospital context is missing.', StatusColorEnum.ERROR);
			return;
		}
		const subCategoryId = selectedSubCategoryId ? Number(selectedSubCategoryId) : null;
		if (!subCategoryId) {
			toastService.addToast('Please select category and sub-category.', StatusColorEnum.ERROR);
			return;
		}
		if (!formServiceName.trim()) {
			toastService.addToast('Service name is required.', StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive ? StatusEnum.ACTIVE : StatusEnum.INACTIVE;
		isSaving = true;
		try {
			if (mode === 'create') {
				await createServiceItem({
					hospitalId,
					subCategoryId,
					serviceName: formServiceName.trim(),
					serviceCode: formServiceCode.trim() || null,
					remark: formRemark.trim() || null,
					statusId
				});
				toastService.addToast('Service item created.', StatusColorEnum.SUCCESS);
			} else if (mode === 'edit' && editingId != null) {
				await updateServiceItem({
					id: editingId,
					serviceName: formServiceName.trim(),
					serviceCode: formServiceCode.trim() || null,
					remark: formRemark.trim() || null,
					statusId
				});
				toastService.addToast('Service item updated.', StatusColorEnum.SUCCESS);
			}
			await fetchServiceItems(true);
			if (mode === 'create') resetForm();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to save service item.';
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
			toastService.addToast('Service item deleted.', StatusColorEnum.SUCCESS);
			await fetchServiceItems(true);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to delete service item.';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function categoryNameById(id: number | null | undefined): string {
		if (id == null) return '—';
		const cat = categories.find((c) => c.id === id);
		return cat?.categoryName ?? `#${id}`;
	}

	function subCategoryNameById(id: number | null | undefined): string {
		if (id == null) return '—';
		const sc = subCategories.find((s) => s.id === id);
		return sc?.subCategoryName ?? `#${id}`;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Service items</h1>
		<DaisyUiButton className="d-btn-outline d-btn-sm" onClick={startCreate}>
			<LucidePlus />
			{m.create()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
				<div class="flex flex-wrap gap-4">
					<div class="flex flex-col gap-1">
						<label class="text-sm font-medium">Category</label>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-64"
							bind:value={selectedCategoryId}
							onChange={onCategoryChange}
							optionHeader="Select category"
						>
							{#each categories as cat (cat.id)}
								<option value={cat.id}>{cat.categoryName ?? `Category ${cat.id}`}</option>
							{/each}
						</DaisyUiSelect>
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-sm font-medium">Sub-category</label>
						<DaisyUiSelect
							className="d-select d-select-bordered d-select-sm w-64"
							bind:value={selectedSubCategoryId}
							onChange={onSubCategoryChange}
							optionHeader="Select sub-category"
						>
							{#each subCategories as sc (sc.id)}
								<option value={sc.id}>{sc.subCategoryName ?? `Sub-category ${sc.id}`}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>

				<div class="flex flex-wrap gap-4">
					<div class="flex flex-col gap-1">
						<label class="text-sm font-medium">Service name<span class="text-error"> *</span></label>
						<DaisyUiInputField
							bind:value={formServiceName}
							inputType="text"
							inputPlaceholderText="Service name"
							required
							className="d-input-sm w-72"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-sm font-medium">Service code</label>
						<DaisyUiInputField
							bind:value={formServiceCode}
							inputType="text"
							inputPlaceholderText="Code (optional)"
							className="d-input-sm w-48"
						/>
					</div>
					<div class="flex flex-col gap-1 flex-1 min-w-56">
						<label class="text-sm font-medium">Remark</label>
						<DaisyUiInputField
							bind:value={formRemark}
							inputType="text"
							inputPlaceholderText="Remark (optional)"
							className="d-input-sm w-full"
						/>
					</div>
					<div class="flex items-end gap-2">
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" bind:checked={formActive} class="d-checkbox d-checkbox-sm" />
							<span>Active</span>
						</label>
					</div>
				</div>

				<div class="flex justify-end gap-2 border-t border-base-300 pt-4">
					<DaisyUiButton type="button" className="d-btn-ghost d-btn-sm" onClick={resetForm}>
						{m.cancel()}
					</DaisyUiButton>
					<DaisyUiButton type="submit" className="d-btn-primary d-btn-sm" disabled={isSaving}>
						{isSaving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
					</DaisyUiButton>
				</div>
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else}
				<DaisyUiTable>
					<DaisyUiTableHeader>
						<tr>
							<th>{m.id()}</th>
							<th>Category</th>
							<th>Sub-category</th>
							<th>{m.name()}</th>
							<th>Code</th>
							<th>{m.status()}</th>
							<th class="text-right">{m.actions()}</th>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each serviceItems as row (row.id)}
							<tr>
								<td>{row.id}</td>
								<td>{categoryNameById(row.subCategoryId ? subCategories.find((s) => s.id === row.subCategoryId)?.categoryId ?? null : null)}</td>
								<td>{subCategoryNameById(row.subCategoryId)}</td>
								<td>{row.serviceName ?? '—'}</td>
								<td>{row.serviceCode ?? '—'}</td>
								<td>{row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'}</td>
								<td class="text-right">
									<div class="flex justify-end gap-2">
										<DaisyUiButton
											className="d-btn-ghost d-btn-sm"
											onClick={() => startEdit(row)}
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
								<td colspan={7} class="text-center text-base-content/70 py-8">
									No service items yet. Create one above.
								</td>
							</tr>
						{/each}
					</DaisyUiTableBody>
				</DaisyUiTable>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>

