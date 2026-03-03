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
		getServiceTagging,
		createServiceTagging,
		updateServiceTagging,
		deleteServiceTagging,
		type ServiceTaggingSchema
	} from '$lib/remote/table/information-table/service-tagging.remote';
	import { getServiceItem } from '$lib/remote/table/information-table/service-item.remote';
	import type { ServiceItemSchema } from '$lib/server/db/schema-type';
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
	/** User's current branch from layout; tagging is always per-branch. "__all__" is not valid for editing. */
	const selectedBranchIdRaw = $derived(data?.selectedBranchId ?? null);
	const branchIdForTagging = $derived(
		selectedBranchIdRaw && selectedBranchIdRaw !== '__all__' ? selectedBranchIdRaw : null
	);

	let serviceItems = $state<ServiceItemSchema[]>([]);
	let taggings = $state<ServiceTaggingSchema[]>([]);

	let selectedServiceId = $state<string>('');

	let formServiceId = $state<string>('');
	let formServiceAmount = $state('');
	let formServiceTaxAmount = $state('');
	let formActive = $state(true);

	type Mode = 'create' | 'edit';
	let mode = $state<Mode>('create');
	let editingId = $state<number | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	const branchLocked = $derived(!!branchIdForTagging);

	async function fetchServiceItems() {
		if (!hospitalId) return;
		// Load all service items for this hospital; you can later filter by category/sub-category if needed.
		serviceItems = await getServiceItem({ hospitalId });
	}

	async function fetchTaggings(forceRefresh = false) {
		if (!branchIdForTagging) return;
		isLoading = true;
		try {
			const serviceId = selectedServiceId ? Number(selectedServiceId) : null;
			const params = { branchId: branchIdForTagging, serviceId: serviceId ?? undefined };
			if (forceRefresh) {
				await getServiceTagging(params).refresh();
			}
			taggings = await getServiceTagging(params);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const _hospital = hospitalId;
		const _branch = branchIdForTagging;
		if (!_hospital || !_branch) return;
		(async () => {
			await fetchServiceItems();
			await fetchTaggings(true);
		})();
	});

	async function onServiceFilterChange() {
		await fetchTaggings(true);
	}

	function resetForm() {
		formServiceId = selectedServiceId || '';
		formServiceAmount = '';
		formServiceTaxAmount = '';
		formActive = true;
		mode = 'create';
		editingId = null;
	}

	function startCreate() {
		resetForm();
	}

	function startEdit(row: ServiceTaggingSchema) {
		mode = 'edit';
		editingId = row.id;
		formServiceId = String(row.serviceId);
		formServiceAmount = row.serviceAmount != null ? String(row.serviceAmount) : '';
		formServiceTaxAmount = row.serviceTaxAmount != null ? String(row.serviceTaxAmount) : '';
		formActive = (row.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!branchIdForTagging) {
			toastService.addToast('Please select a branch in the top bar to manage tagging.', StatusColorEnum.ERROR);
			return;
		}
		const serviceId = formServiceId ? Number(formServiceId) : null;
		if (!serviceId) {
			toastService.addToast('Service is required.', StatusColorEnum.ERROR);
			return;
		}
		const amount = String(formServiceAmount ?? '').trim();
		if (!amount) {
			toastService.addToast('Service amount is required.', StatusColorEnum.ERROR);
			return;
		}
		const serviceAmount = Number(amount);
		if (Number.isNaN(serviceAmount)) {
			toastService.addToast('Service amount must be a number.', StatusColorEnum.ERROR);
			return;
		}
		const taxStr = String(formServiceTaxAmount ?? '').trim();
		const serviceTaxAmount = taxStr ? Number(taxStr) : 0;
		if (taxStr && Number.isNaN(serviceTaxAmount)) {
			toastService.addToast('Tax amount must be a number.', StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive ? StatusEnum.ACTIVE : StatusEnum.INACTIVE;

		isSaving = true;
		try {
			if (mode === 'create') {
				await createServiceTagging({
					branchId: branchIdForTagging,
					serviceId,
					serviceAmount,
					serviceTaxAmount,
					statusId
				});
				toastService.addToast('Service tagging created.', StatusColorEnum.SUCCESS);
			} else if (mode === 'edit' && editingId != null) {
				await updateServiceTagging({
					id: editingId,
					serviceAmount,
					serviceTaxAmount,
					statusId
				});
				toastService.addToast('Service tagging updated.', StatusColorEnum.SUCCESS);
			}
			await fetchTaggings(true);
			if (mode === 'create') resetForm();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to save service tagging.';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(row: ServiceTaggingSchema) {
		const result = await dialogService.open({
			title: 'Delete service tagging',
			message: `Delete tagging for this service?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteServiceTagging({ id: row.id });
			toastService.addToast('Service tagging deleted.', StatusColorEnum.SUCCESS);
			await fetchTaggings(true);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to delete service tagging.';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function serviceNameById(id: number | null | undefined): string {
		if (id == null) return '—';
		const s = serviceItems.find((x) => x.id === id);
		return s?.serviceName ?? `#${id}`;
	}
</script>

<div class="space-y-6">
	{#if !branchIdForTagging}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<p class="text-base-content/80">
					Please select a branch in the top bar to manage service tagging.
				</p>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold">Service tagging</h1>
			<DaisyUiButton className="d-btn-outline d-btn-sm" onClick={startCreate}>
				<LucidePlus />
				{m.create()}
			</DaisyUiButton>
		</div>

		<DaisyUiCard>
			<DaisyUiCardBody>
				<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
					<div class="flex flex-wrap gap-4 items-end">
						<div class="flex flex-col gap-1">
							<label class="text-sm font-medium">Service (filter)</label>
							<DaisyUiSelect
								className="d-select d-select-bordered d-select-sm w-72"
								bind:value={selectedServiceId}
								onChange={onServiceFilterChange}
								optionHeader="All services"
							>
								{#each serviceItems as s (s.id)}
									<option value={s.id}>{s.serviceName ?? `Service ${s.id}`}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>

					<div class="flex flex-wrap gap-4">
						<div class="flex flex-col gap-1">
							<label class="text-sm font-medium">Service<span class="text-error"> *</span></label>
							<DaisyUiSelect
								className="d-select d-select-bordered d-select-sm w-72"
								bind:value={formServiceId}
								optionHeader="Select service"
							>
								{#each serviceItems as s (s.id)}
									<option value={s.id}>{s.serviceName ?? `Service ${s.id}`}</option>
								{/each}
							</DaisyUiSelect>
						</div>
						<div class="flex flex-col gap-1">
							<label class="text-sm font-medium">Amount<span class="text-error"> *</span></label>
							<DaisyUiInputField
								bind:value={formServiceAmount}
								inputType="number"
								inputPlaceholderText="0.00"
								required
								className="d-input-sm w-40"
							/>
						</div>
						<div class="flex flex-col gap-1">
							<label class="text-sm font-medium">Tax amount</label>
							<DaisyUiInputField
								bind:value={formServiceTaxAmount}
								inputType="number"
								inputPlaceholderText="0.00"
								className="d-input-sm w-40"
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
								<th>Service</th>
								<th>Amount</th>
								<th>Tax amount</th>
								<th>{m.status()}</th>
								<th class="text-right">{m.actions()}</th>
							</tr>
						</DaisyUiTableHeader>
						<DaisyUiTableBody>
							{#each taggings as row (row.id)}
								<tr>
									<td>{row.id}</td>
									<td>{serviceNameById(row.serviceId)}</td>
									<td>{row.serviceAmount ?? '—'}</td>
									<td>{row.serviceTaxAmount ?? '—'}</td>
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
									<td colspan={6} class="text-center text-base-content/70 py-8">
										No service tagging records yet. Create one above.
									</td>
								</tr>
							{/each}
						</DaisyUiTableBody>
					</DaisyUiTable>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>