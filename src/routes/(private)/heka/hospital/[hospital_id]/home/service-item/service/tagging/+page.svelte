<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
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
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	let { data } = $props();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	/** User's current branch from layout; tagging is always per-branch. "__all__" is not valid for editing. */
	const selectedBranchIdRaw = $derived(
		data?.selectedBranchId ?? null
	);
	const branchIdForTagging = $derived(
		selectedBranchIdRaw && selectedBranchIdRaw !== '__all__'
			? selectedBranchIdRaw
			: null
	);

	let serviceItems = $state<ServiceItemSchema[]>([]);
	let taggings = $state<ServiceTaggingSchema[]>([]);

	let formServiceId = $state<string>('');
	let formServiceAmount = $state('');
	let formServiceTaxAmount = $state('');
	let formActive = $state(true);

	type Mode = 'create' | 'edit';
	let mode = $state<Mode>('create');
	let editingId = $state<number | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	let tableColumnFilters = $state<Record<string, string>>({});

	const branchLocked = $derived(!!branchIdForTagging);

	const taggingColumns: MariTableColumn<ServiceTaggingSchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-20'
		},
		{
			id: 'service',
			header: 'Service',
			widthClass: 'w-64',
			format: (_value, row) => serviceNameById(row.serviceId)
		},
		{
			id: 'serviceAmount',
			header: 'Amount',
			widthClass: 'w-32',
			field: 'serviceAmount'
		},
		{
			id: 'serviceTaxAmount',
			header: 'Tax amount',
			widthClass: 'w-32',
			field: 'serviceTaxAmount'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32',
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];

	async function fetchServiceItems() {
		if (!hospitalId) return;
		// Load all service items for this hospital; you can later filter by category/sub-category if needed.
		serviceItems = await getServiceItem({ hospitalId });
	}

	async function fetchTaggings(forceRefresh = false) {
		if (!branchIdForTagging) return;
		isLoading = true;
		try {
			const filters = tableColumnFilters;

			const params: {
				branchId: string;
				serviceIds?: number[];
				serviceAmount?: number;
				serviceTaxAmount?: number;
				statusId?: number;
				id?: number;
			} = {
				branchId: branchIdForTagging
			};

			// ID filter
			const idTerm = filters.id?.trim();
			if (idTerm) {
				const idVal = Number(idTerm);
				if (!Number.isNaN(idVal)) {
					params.id = idVal;
				}
			}

			// Service name filter -> serviceIds list
			const serviceFilter = filters.service?.trim().toLowerCase();
			if (serviceFilter) {
				const serviceIds = serviceItems
					.filter((s) =>
						(s.serviceName ?? '')
							.toLowerCase()
							.includes(serviceFilter)
					)
					.map((s) => s.id);

				if (serviceIds.length === 0) {
					taggings = [];
					return;
				}

				params.serviceIds = serviceIds;
			}

			// Amount filters
			const amountTerm = filters.serviceAmount?.trim();
			if (amountTerm) {
				const value = Number(amountTerm);
				if (!Number.isNaN(value)) {
					params.serviceAmount = value;
				}
			}

			const taxAmountTerm = filters.serviceTaxAmount?.trim();
			if (taxAmountTerm) {
				const value = Number(taxAmountTerm);
				if (!Number.isNaN(value)) {
					params.serviceTaxAmount = value;
				}
			}

			// Status filter
			const statusTerm = filters.status?.trim().toLowerCase();
			if (statusTerm === 'active') {
				params.statusId = StatusEnum.ACTIVE;
			} else if (statusTerm === 'inactive') {
				params.statusId = StatusEnum.INACTIVE;
			}

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

	function resetForm() {
		formServiceId = '';
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
		formServiceAmount =
			row.serviceAmount != null ? String(row.serviceAmount) : '';
		formServiceTaxAmount =
			row.serviceTaxAmount != null
				? String(row.serviceTaxAmount)
				: '';
		formActive =
			(row.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
	}

	function handleTableFiltersChange(
		event: CustomEvent<{ filters: Record<string, string> }>
	) {
		tableColumnFilters = event.detail.filters;
		fetchTaggings(true);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!branchIdForTagging) {
			toastService.addToast(
				'Please select a branch in the top bar to manage tagging.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const serviceId = formServiceId ? Number(formServiceId) : null;
		if (!serviceId) {
			toastService.addToast(
				'Service is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const amount = String(formServiceAmount ?? '').trim();
		if (!amount) {
			toastService.addToast(
				'Service amount is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const serviceAmount = Number(amount);
		if (Number.isNaN(serviceAmount)) {
			toastService.addToast(
				'Service amount must be a number.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const taxStr = String(formServiceTaxAmount ?? '').trim();
		const serviceTaxAmount = taxStr ? Number(taxStr) : 0;
		if (taxStr && Number.isNaN(serviceTaxAmount)) {
			toastService.addToast(
				'Tax amount must be a number.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;

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
				toastService.addToast(
					'Service tagging created.',
					StatusColorEnum.SUCCESS
				);
			} else if (mode === 'edit' && editingId != null) {
				await updateServiceTagging({
					id: editingId,
					serviceAmount,
					serviceTaxAmount,
					statusId
				});
				toastService.addToast(
					'Service tagging updated.',
					StatusColorEnum.SUCCESS
				);
			}
			await fetchTaggings(true);
			if (mode === 'create') resetForm();
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Failed to save service tagging.';
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
			toastService.addToast(
				'Service tagging deleted.',
				StatusColorEnum.SUCCESS
			);
			await fetchTaggings(true);
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Failed to delete service tagging.';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function serviceNameById(id: number | null | undefined): string {
	if (id == null) return '—';
	const s = serviceItems.find((x) => x.id === id);
	if (!s) return `ID ${id}`;
	const name = (s.serviceName ?? '').trim();
	const code = (s.serviceCode ?? '').trim();
	if (name && code) return `${name} (${code})`;
	if (name) return name;
	if (code) return code;
	return `ID ${id}`;
	}
</script>

<div class="space-y-6">
	{#if !branchIdForTagging}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<p class="text-base-content/80">
					Please select a branch in the top bar to manage service
					tagging.
				</p>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold">Service tagging</h1>
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
						<div class="flex min-w-60 flex-1 flex-col gap-1">
							<label class="text-sm font-medium"
								>Service<span class="text-error"> *</span></label
							>
							<DaisyUiSelect
								className="d-select d-select-bordered d-select-sm w-full"
								bind:value={formServiceId}
								optionHeader="Select service"
							>
								{#each serviceItems as s (s.id)}
									<option value={String(s.id)}
										>{s.serviceName ?? `Service ${s.id}`}</option
									>
								{/each}
							</DaisyUiSelect>
						</div>
						<div class="flex min-w-40 flex-1 flex-col gap-1">
							<label class="text-sm font-medium"
								>Amount<span class="text-error"> *</span></label
							>
							<DaisyUiInputField
								bind:value={formServiceAmount}
								inputType="number"
								inputPlaceholderText="0.00"
								required
								className="d-input-sm w-full"
							/>
						</div>
						<div class="flex min-w-40 flex-1 flex-col gap-1">
							<label class="text-sm font-medium">Tax amount</label>
							<DaisyUiInputField
								bind:value={formServiceTaxAmount}
								inputType="number"
								inputPlaceholderText="0.00"
								className="d-input-sm w-full"
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
				<MariTable
					rows={taggings}
					columns={taggingColumns}
					isLoading={isLoading}
					enableColumnFilters={true}
					useRemoteFilters={true}
					actionsHeader={m.actions()}
					actionsVariant="crud"
					on:refresh={() => fetchTaggings(true)}
					on:filtersChange={handleTableFiltersChange}
					on:edit={(event) => startEdit(event.detail)}
					on:delete={(event) => handleDelete(event.detail)}
				/>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
