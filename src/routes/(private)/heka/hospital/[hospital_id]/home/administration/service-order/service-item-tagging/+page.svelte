<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		getServiceTaggingPaginated,
		getServiceTagging,
		createServiceTagging,
		updateServiceTagging,
		deleteServiceTagging
	} from '$lib/remote/table/information-table/service-tagging.remote';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import { getServiceItem } from '$lib/remote/table/information-table/service-item.remote';
	import type {
		ServiceItemSchema,
		ServiceTaggingSchema
	} from '$lib/server/db/schema-type';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StringUtil } from '$lib/util/string.util.svelte.js';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	let { data } = $props();

	type AllowedBranch = { id: string; name: string | null };

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	const allowedBranches = $derived(
		((data?.allowedBranches ?? []) as AllowedBranch[]) ?? []
	);

	const branchOptions = $derived(allowedBranches);

	let selectedBranchIds = $state<string[]>(branchOptions[0] ? [branchOptions[0].id] : []);
const allowedBranchIdSet = $derived(new Set(allowedBranches.map((b) => b.id)));

	let serviceItems = $state<ServiceItemSchema[]>([]);
	let taggingResult =
		$state<PaginatedResult<ServiceTaggingSchema> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const taggings = $derived(taggingResult?.data ?? []);
	const total = $derived(taggingResult?.total ?? 0);
const serviceOptions = $derived.by(() =>
	serviceItems.map((s) => ({
		value: String(s.id),
		label: StringUtil.serviceOptionDisplayName(s),
	}))
);

	let formServiceId = $state<string>('');
	let formServiceAmount = $state('');
	let formServiceTaxAmount = $state('');
	let formValidDate = $state('');
	let formAllowEdit = $state(true);
	let formActive = $state(true);


	type Mode = 'create' | 'edit';
	let mode = $state<Mode>('create');
	let editingId = $state<number | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);

	let tableColumnFilters = $state<Record<string, string>>({});

	let isComparativeMode = $state(false);
	let comparativeTaggings = $state<ServiceTaggingSchema[]>([]);
	let isComparativeLoading = $state(false);

	function toDateInputValue(
		value: ServiceTaggingSchema['validDate']
	): string {
		if (!value) return '';
		const str = String(value);
		return str.length >= 10 ? str.slice(0, 10) : str;
	}

	const taggingColumns: MariTableColumn<ServiceTaggingSchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-20'
		},
		{
			id: 'branch',
			header: 'Branch',
			widthClass: 'w-48',
			format: (_value, row) => branchNameById(row.branchId)
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
			id: 'validDate',
			header: 'Valid date',
			widthClass: 'w-36',
			format: (_value, row) =>
				row.validDate ? toDateInputValue(row.validDate) : '—',
			filterable: false
		},
		{
			id: 'allowEdit',
			header: 'Allow edit',
			widthClass: 'w-28',
			format: (_value, row) => (row.allowEdit ? 'Yes' : 'No'),
			filterable: false
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

	async function fetchServiceItems() {
		if (!hospitalId) return;
		// Load all service items for this hospital; you can later filter by category/sub-category if needed.
		serviceItems = await getServiceItem({ hospitalId });
	}

	async function fetchTaggings(forceRefresh = false) {
		if (allowedBranches.length === 0 || selectedBranchIds.length === 0) return;
		isLoading = true;
		try {
			const filters = tableColumnFilters;
			const selectedAllowedBranchIds = selectedBranchIds.filter((id) =>
				allowedBranchIdSet.has(id)
			);
			if (selectedAllowedBranchIds.length === 0) {
				const pageSize = Number(pageSizeStr) || 10;
				taggingResult = {
					data: [],
					total: 0,
					page: 1,
					pageSize,
					totalPages: 1
				};
				return;
			}

			const paramsBase: {
				branchId?: string;
				serviceIds?: number[];
				serviceAmount?: number;
				serviceTaxAmount?: number;
				statusId?: number;
				id?: number;
			} = {};

			if (selectedAllowedBranchIds.length === 1) {
				paramsBase.branchId = selectedAllowedBranchIds[0];
			}

			// ID filter
			const idTerm = filters.id?.trim();
			if (idTerm) {
				const idVal = Number(idTerm);
				if (!Number.isNaN(idVal)) {
					paramsBase.id = idVal;
				}
			}

			// Service name filter -> serviceIds list
			const serviceFilter = filters.service?.trim().toLowerCase();
			if (serviceFilter) {
				const serviceIds = serviceItems
					.filter((s) => {
						const name = (s.serviceName ?? '').toLowerCase();
						const code = (s.serviceCode ?? '').toLowerCase();
						return (
							name.includes(serviceFilter) ||
							code.includes(serviceFilter)
						);
					})
					.map((s) => s.id);

				if (serviceIds.length === 0) {
					const pageSize = Number(pageSizeStr) || 10;
					taggingResult = {
						data: [],
						total: 0,
						page: 1,
						pageSize,
						totalPages: 1
					};
					return;
				}

				paramsBase.serviceIds = serviceIds;
			}

			// Amount filters
			const amountTerm = filters.serviceAmount?.trim();
			if (amountTerm) {
				const value = Number(amountTerm);
				if (!Number.isNaN(value)) {
					paramsBase.serviceAmount = value;
				}
			}

			const taxAmountTerm = filters.serviceTaxAmount?.trim();
			if (taxAmountTerm) {
				const value = Number(taxAmountTerm);
				if (!Number.isNaN(value)) {
					paramsBase.serviceTaxAmount = value;
				}
			}

			// Status filter
			const statusVal = filters.status?.trim();
			if (statusVal) {
				const num = Number(statusVal);
				if (num === StatusEnum.ACTIVE || num === StatusEnum.INACTIVE) {
					paramsBase.statusId = num;
				}
			}

			const pageSize = Number(pageSizeStr) || 10;
			const paginatedParams = {
				...paramsBase,
				page: currentPage,
				pageSize
			};

			if (forceRefresh) {
				await getServiceTaggingPaginated(paginatedParams).refresh();
			}

			let result = await getServiceTaggingPaginated(paginatedParams);

			// When multiple branches are selected, filter in-memory.
			if (selectedAllowedBranchIds.length > 1) {
				const allowedIds = new Set(selectedAllowedBranchIds);
				const filteredData = result.data.filter((row) =>
					allowedIds.has(row.branchId)
				);
				const totalFiltered = filteredData.length;
				result = {
					...result,
					data: filteredData,
					total: totalFiltered,
					totalPages: Math.ceil(totalFiltered / pageSize) || 1
				};
			}

			taggingResult = result;
		} finally {
			isLoading = false;
		}
	}

	async function fetchComparativeTaggings() {
		if (allowedBranches.length === 0 || selectedBranchIds.length === 0) return;
		const selectedAllowedBranchIds = selectedBranchIds.filter((id) =>
			allowedBranchIdSet.has(id)
		);
		if (selectedAllowedBranchIds.length === 0) return;
		isComparativeLoading = true;
		try {
			const results = await Promise.all(
				selectedAllowedBranchIds.map((branchId) =>
					getServiceTagging({
						branchId,
						statusId: StatusEnum.ACTIVE
					})
				)
			);
			comparativeTaggings = results.flat();
		} finally {
			isComparativeLoading = false;
		}
	}

	$effect(() => {
		const _hospital = hospitalId;
		const _branchSelection = selectedBranchIds.join(',');
		if (!mounted) return;
		if (
			!_hospital ||
			allowedBranches.length === 0 ||
			!_branchSelection
		)
			return;
		(async () => {
			await fetchServiceItems();
			await fetchTaggings(true);
		})();
	});

	$effect(() => {
		if (isComparativeMode && selectedBranchIds.length > 0) {
			fetchComparativeTaggings();
		}
	});

	function resetForm() {
		formServiceId = '';
		formServiceAmount = '';
		formServiceTaxAmount = '';
		formValidDate = '';
		formAllowEdit = true;
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
		formValidDate = toDateInputValue(row.validDate);
		formAllowEdit = row.allowEdit ?? true;
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
			fetchTaggings(true);
		}, 350);
	}

	function onBranchChange() {
		if (selectedBranchIds.length > 0) {
			currentPage = 1;
			fetchTaggings(true);
		} else {
			taggingResult = {
				data: [],
				total: 0,
				page: 1,
				pageSize: Number(pageSizeStr) || 10,
				totalPages: 1
			};
		}
	}

	$effect(() => {
		const allowedIds = new Set(allowedBranches.map((b) => b.id));
		const cleaned = selectedBranchIds.filter((id) => allowedIds.has(id));
		if (
			cleaned.length === selectedBranchIds.length &&
			cleaned.every((id, i) => id === selectedBranchIds[i])
		) {
			if (cleaned.length > 0 || allowedBranches.length === 0) return;
		}

		selectedBranchIds =
			cleaned.length > 0
				? cleaned
				: allowedBranches[0]
					? [allowedBranches[0].id]
					: [];
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (selectedBranchIds.length === 0) {
			toastService.addToast(
				'Please select at least one branch to manage tagging.',
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
		const serviceAmountNum = Number(amount);
		if (Number.isNaN(serviceAmountNum)) {
			toastService.addToast(
				'Service amount must be a number.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const taxStr = String(formServiceTaxAmount ?? '').trim();
		const serviceTaxAmountNum = taxStr ? Number(taxStr) : 0;
		if (taxStr && Number.isNaN(serviceTaxAmountNum)) {
			toastService.addToast(
				'Tax amount must be a number.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		const validDate = formValidDate.trim()
			? formValidDate.trim()
			: null;
		const allowEdit = formAllowEdit;

		const targetBranchIds = selectedBranchIds.filter((id) =>
			allowedBranchIdSet.has(id)
		);
		if (targetBranchIds.length === 0) {
			toastService.addToast(
				'No branches available for tagging.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSaving = true;
		try {
			if (mode === 'create') {
				await Promise.all(
					targetBranchIds.map((branchId) =>
						createServiceTagging({
							branchId,
							serviceId,
							serviceAmount: serviceAmountNum.toString(),
							serviceTaxAmount: taxStr
								? serviceTaxAmountNum.toString()
								: null,
							validDate,
							allowEdit,
							statusId
						})
					)
				);
				toastService.addToast(
					'Service tagging created.',
					StatusColorEnum.SUCCESS
				);
			} else if (mode === 'edit' && editingId != null) {
				await updateServiceTagging({
					id: editingId,
					serviceAmount: serviceAmountNum.toString(),
					serviceTaxAmount: taxStr
						? serviceTaxAmountNum.toString()
						: null,
					validDate,
					allowEdit,
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
	function branchNameById(id: string | null | undefined): string {
		if (!id) return '—';
		const b = allowedBranches.find((x) => x.id === id);
		return b?.name ?? `Branch ${id}`;
	}

	function serviceNameById(id: number | null | undefined): string {
		if (id == null) return '—';
		const s = serviceItems.find((x) => x.id === id);
		if (!s) return `ID ${id}`;
		const name = (s.serviceName ?? '').trim() || `Service ${s.id}`;
		const code = (s.serviceCode ?? '').trim();
		return code ? `${name} - ${code}` : name;
	}

	type ComparativeRow = {
		serviceId: number;
		serviceName: string;
		branches: Array<{
			branchId: string;
			branchName: string;
			amount: string | null;
			tax: string | null;
			taggingId: number | null;
		}>;
	};

	const comparativeRows = $derived.by((): ComparativeRow[] => {
		if (!isComparativeMode || comparativeTaggings.length === 0) return [];
		const selectedAllowedBranchIds = selectedBranchIds.filter((id) =>
			allowedBranchIdSet.has(id)
		);
		if (selectedAllowedBranchIds.length === 0) return [];

		const byService = new Map<
			number,
			Map<string, { amount: string | null; tax: string | null; id: number }>
		>();
		for (const t of comparativeTaggings) {
			if (!selectedAllowedBranchIds.includes(t.branchId)) continue;
			let serviceMap = byService.get(t.serviceId);
			if (!serviceMap) {
				serviceMap = new Map();
				byService.set(t.serviceId, serviceMap);
			}
			serviceMap.set(t.branchId, {
				amount: t.serviceAmount ?? null,
				tax: t.serviceTaxAmount ?? null,
				id: t.id
			});
		}

		return Array.from(byService.entries())
			.map(([serviceId, branchMap]) => {
				const branches = selectedAllowedBranchIds.map((branchId) => {
					const data = branchMap.get(branchId);
					const branch = allowedBranches.find((b) => b.id === branchId);
					return {
						branchId,
						branchName: branch?.name ?? branchId,
						amount: data?.amount ?? null,
						tax: data?.tax ?? null,
						taggingId: data?.id ?? null
					};
				});
				return {
					serviceId,
					serviceName: serviceNameById(serviceId),
					branches
				};
			})
			.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
	});
</script>

<div class="space-y-6">
	{#if allowedBranches.length === 0}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<p class="text-base-content/80">
					You do not have access to any branches for this hospital.
				</p>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold">Service Item Tagging</h1>
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
					<div class="min-w-0 flex-1 md:min-w-56">
						<DaisyUiLabel className="mb-2 block"
							>Branch <span class="text-error">*</span></DaisyUiLabel
						>
						<div
							class="grid max-h-28 grid-cols-1 gap-1 overflow-auto rounded-lg border-2 border-base-300 bg-base-200/30 p-2 lg:grid-cols-2"
						>
							{#each branchOptions as b (b.id)}
								{@const isChecked = selectedBranchIds.includes(b.id)}
								{@const toggleBranch = () => {
									if (isChecked) {
										selectedBranchIds = selectedBranchIds.filter((id) => id !== b.id);
									} else {
										selectedBranchIds = [...selectedBranchIds, b.id];
									}
									onBranchChange();
								}}
								<DaisyUiButton
									type="button"
									className="cursor-pointer flex justify-start py-1"
									onClick={toggleBranch}
								>
									<DaisyUiCheckbox checked={isChecked} />
									<span class="text-xs">{b.name ?? 'Unnamed branch'}</span>
								</DaisyUiButton>
							{/each}
						</div>
					</div>

					<div class="flex flex-wrap gap-4">
						<div class="flex min-w-60 flex-1 flex-col gap-1">
							<label class="text-sm font-medium"
								>Service<span class="text-error"> *</span></label
							>
							<DaisyUiSearchSelect
								bind:value={formServiceId}
								options={serviceOptions}
								placeholder="Select service"
								className="d-input-sm w-full"
							/>
						</div>
						<div class="flex min-w-40 flex-1 flex-col gap-1">
							<label class="text-sm font-medium"
								>Amount<span class="text-error"> *</span></label
							>
							<DaisyUiInputField
								bind:value={formServiceAmount}
								inputType="number"
								step="0.01"
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
								step="0.01"
								inputPlaceholderText="0.00"
								className="d-input-sm w-full"
							/>
						</div>
						<div class="flex min-w-40 flex-1 flex-col gap-1">
							<label class="text-sm font-medium">Valid date</label>
							<DaisyUiInputField
								bind:value={formValidDate}
								inputType="date"
								className="d-input-sm w-full"
							/>
						</div>
						<div class="flex items-end gap-4">
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									bind:checked={formAllowEdit}
									class="d-checkbox d-checkbox-sm"
								/>
								<span>Allow edit</span>
							</label>
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
				<div class="mb-4 flex items-center justify-between gap-4">
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							class="d-toggle d-toggle-primary d-toggle-sm"
							bind:checked={isComparativeMode}
						/>
						<span class="text-sm font-medium">Comparative Mode</span>
					</label>
					{#if isComparativeMode}
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={() => fetchComparativeTaggings()}
							disabled={isComparativeLoading}
						>
							Refresh
						</DaisyUiButton>
					{/if}
				</div>

				{#if isComparativeMode}
					<div class={TableEnum.HEIGHT}>
						{#if isComparativeLoading}
							<div class="flex min-h-[200px] items-center justify-center">
								<DaisyUiLoading />
							</div>
						{:else if comparativeRows.length === 0}
							<div class="flex min-h-[200px] items-center justify-center text-base-content/70">
								No records found. Select branches and ensure services are tagged.
							</div>
						{:else}
							<div class="overflow-x-auto">
								<table class="d-table d-table-zebra d-table-pin-rows d-table-pin-cols d-table-sm">
									<thead>
										<tr>
											<th class="sticky left-0 z-10 min-w-[200px] bg-base-200">
												Service
											</th>
											{#each selectedBranchIds.filter((id) =>
												allowedBranchIdSet.has(id)
											) as branchId}
												{@const branch = allowedBranches.find((b) => b.id === branchId)}
												<th
													class="min-w-[140px] bg-base-200 text-center"
													colspan="2"
												>
													{branch?.name ?? branchId}
												</th>
											{/each}
										</tr>
										<tr>
											<th class="sticky left-0 z-10 bg-base-200"></th>
											{#each selectedBranchIds.filter((id) =>
												allowedBranchIdSet.has(id)
											) as _}
												<th class="bg-base-200/80 text-xs font-normal">Amount</th>
												<th class="bg-base-200/80 text-xs font-normal">Tax</th>
											{/each}
										</tr>
									</thead>
									<tbody>
										{#each comparativeRows as row (row.serviceId)}
											<tr>
												<td class="sticky left-0 z-10 bg-base-100 font-medium">
													{row.serviceName}
												</td>
												{#each row.branches as branch}
													<td class="text-right tabular-nums">
														{branch.amount ?? '—'}
													</td>
													<td class="text-right tabular-nums">
														{branch.tax ?? '—'}
													</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{:else}
					<div class={TableEnum.HEIGHT}>
						<MariTable
							rows={taggings}
							columns={taggingColumns}
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
							on:refresh={() => fetchTaggings(true)}
							on:pageSizeChange={() => {
								currentPage = 1;
								fetchTaggings(true);
							}}
							on:pageChange={() => fetchTaggings(true)}
							on:filtersChange={handleTableFiltersChange}
							on:edit={(event) => startEdit(event.detail)}
							on:delete={(event) => handleDelete(event.detail)}
						/>
					</div>
				{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>
