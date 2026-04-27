<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { ItemMasterModalState } from '$lib/state/item-master-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type {
		CategoryListRow,
		ItemMasterListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const itemMasterApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master`
			: ''
	);
	const pharmacyGenericApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/pharmacy-generic`
			: ''
	);
	const manufacturerApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/manufacture-setup`
			: ''
	);

	async function apiGet<T>(path: string): Promise<T> {
		if (!itemMasterApi) throw new Error('Hospital context missing');
		const res = await fetch(`${itemMasterApi}${path}`, {
			credentials: 'include',
			cache: 'no-store'
		});
		if (!res.ok) {
			const t = await res.text().catch(() => '');
			throw new Error(t || `Request failed: ${res.status}`);
		}
		return res.json() as Promise<T>;
	}

	let categories = $state<CategoryListRow[]>([]);
	let itemUnitMasters = $state<
		{
			id: number;
			conversionDisplay: string;
			purchaseUnitId: number;
			issueUnitId: number;
		}[]
	>([]);

	let itemName = $state('');
	let categoryIdStr = $state('');
	let itemCode = $state('');
	let barcode = $state('');
	let itemUnitMasterIdStrs = $state<string[]>([]);
	/** Radio `bind:group` for default conversion among included rows. */
	let defaultItemUnitMasterIdStr = $state('');
	let unitConversionFilter = $state('');
	let description = $state('');
	let remark = $state('');
	let pharmacyGenericIdStr = $state('');
	let manufacturerIdStr = $state('');
	let isBatchRequired = $state(false);
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const unitDefaultRadioName = $derived(
		hospitalId ? `im-iu-def-${hospitalId}` : 'im-iu-def'
	);

	const filteredItemUnitMasters = $derived.by(() => {
		const q = unitConversionFilter.trim().toLowerCase();
		if (!q) return itemUnitMasters;
		return itemUnitMasters.filter(
			(o) =>
				o.conversionDisplay.toLowerCase().includes(q) ||
				String(o.id).includes(q)
		);
	});

	function firstIncludedIdByListOrder(): string {
		for (const opt of itemUnitMasters) {
			const k = String(opt.id);
			if (itemUnitMasterIdStrs.includes(k)) return k;
		}
		return itemUnitMasterIdStrs[0] ?? '';
	}

	function toggleItemUnitMaster(id: number) {
		const key = String(id);
		if (itemUnitMasterIdStrs.includes(key)) {
			itemUnitMasterIdStrs = itemUnitMasterIdStrs.filter((x) => x !== key);
			if (defaultItemUnitMasterIdStr === key) {
				defaultItemUnitMasterIdStr = firstIncludedIdByListOrder();
			}
		} else {
			const prevDefault = defaultItemUnitMasterIdStr;
			const nextIds = [...itemUnitMasterIdStrs, key];
			itemUnitMasterIdStrs = nextIds;
			if (!prevDefault || !nextIds.includes(prevDefault)) {
				defaultItemUnitMasterIdStr = key;
			}
		}
	}

	$effect(() => {
		const ids = itemUnitMasterIdStrs;
		const d = defaultItemUnitMasterIdStr;
		if (ids.length === 0) {
			if (d) defaultItemUnitMasterIdStr = '';
			return;
		}
		if (d && !ids.includes(d)) {
			defaultItemUnitMasterIdStr = firstIncludedIdByListOrder();
			return;
		}
		if (ids.length === 1 && !d) {
			defaultItemUnitMasterIdStr = ids[0] ?? '';
		}
	});

	const isPharmacySupplyCategory = $derived(
		Number(categoryIdStr) === CategoryEnum.PHARMACY_SUPPLY
	);

	$effect(() => {
		if (Number(categoryIdStr) !== CategoryEnum.PHARMACY_SUPPLY) {
			pharmacyGenericIdStr = '';
		}
	});

	const modalState = $derived(ItemMasterModalState);
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editItem != null
	);

	async function searchPharmacyGenerics(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!pharmacyGenericApi) return [];
		const q = new URLSearchParams({
			mode: 'search',
			q: query,
			limit: '50'
		});
		const res = await fetch(`${pharmacyGenericApi}?${q.toString()}`, {
			credentials: 'include',
			cache: 'no-store'
		});
		if (!res.ok) return [];
		const rows = (await res.json()) as {
			id: number;
			name: string;
			code: string | null;
		}[];
		return rows.map((r) => ({
			value: String(r.id),
			label: r.code ? `${r.name} (${r.code})` : r.name
		}));
	}

	async function searchManufacturers(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!manufacturerApi) return [];
		const q = new URLSearchParams({
			mode: 'search',
			q: query,
			limit: '50'
		});
		const res = await fetch(`${manufacturerApi}?${q.toString()}`, {
			credentials: 'include',
			cache: 'no-store'
		});
		if (!res.ok) return [];
		const rows = (await res.json()) as {
			id: number;
			name: string;
			code: string | null;
		}[];
		return rows.map((r) => ({
			value: String(r.id),
			label: r.code ? `${r.name} (${r.code})` : r.name
		}));
	}

	async function getManufacturerLabelForValue(
		value: string
	): Promise<string> {
		if (!value?.trim() || !manufacturerApi) return '';
		const res = await fetch(
			`${manufacturerApi}?id=${encodeURIComponent(value)}`,
			{ credentials: 'include', cache: 'no-store' }
		);
		if (!res.ok) return '—';
		const row = (await res.json()) as {
			name?: string | null;
			code?: string | null;
		} | null;
		if (!row) return '—';
		const n = row.name ?? '—';
		return row.code ? `${n} (${row.code})` : n;
	}

	async function getPharmacyGenericLabelForValue(
		value: string
	): Promise<string> {
		if (!value?.trim() || !pharmacyGenericApi) return '';
		const res = await fetch(
			`${pharmacyGenericApi}?id=${encodeURIComponent(value)}`,
			{ credentials: 'include', cache: 'no-store' }
		);
		if (!res.ok) return '—';
		const row = (await res.json()) as {
			name?: string | null;
			code?: string | null;
		} | null;
		if (!row) return '—';
		const n = row.name ?? '—';
		return row.code ? `${n} (${row.code})` : n;
	}

	lifeCycleUtil.onMount(async () => {
		const editing =
			ItemMasterModalState.mode === 'edit' &&
			ItemMasterModalState.editItem != null;
		try {
			const [cats, iums] = await Promise.all([
				apiGet<CategoryListRow[]>('?mode=categories'),
				apiGet<
					{
						id: number;
						conversionDisplay: string;
						purchaseUnitId: number;
						issueUnitId: number;
					}[]
				>('?mode=itemUnitMasters')
			]);
			categories = cats;
			itemUnitMasters = iums;

			if (editing && ItemMasterModalState.editItem) {
				const row = await apiGet<ItemMasterListRow | null>(
					`?id=${encodeURIComponent(String(ItemMasterModalState.editItem.id))}`
				);
				if (row) {
					itemName = row.itemName ?? '';
					categoryIdStr = String(row.categoryId);
					itemCode = row.itemCode ?? '';
					barcode = row.barcode ?? '';
					description = row.description ?? '';
					remark = row.remark ?? '';
					const idStrs = (row.itemUnitMasterIds ?? []).map((id) =>
						String(id)
					);
					itemUnitMasterIdStrs = idStrs;
					const defId = row.defaultItemUnitMasterId;
					if (defId != null && idStrs.includes(String(defId))) {
						defaultItemUnitMasterIdStr = String(defId);
					} else if (idStrs.length > 0) {
						let firstByList = '';
						for (const opt of iums) {
							if (idStrs.includes(String(opt.id))) {
								firstByList = String(opt.id);
								break;
							}
						}
						defaultItemUnitMasterIdStr =
							firstByList || (idStrs[0] ?? '');
					} else {
						defaultItemUnitMasterIdStr = '';
					}
					formActive =
						(row.statusId ?? StatusEnum.ACTIVE) ===
						StatusEnum.ACTIVE;

					pharmacyGenericIdStr =
						row.pharmacyGenericId != null
							? String(row.pharmacyGenericId)
							: '';
					manufacturerIdStr =
						row.manufacturerId != null
							? String(row.manufacturerId)
							: '';
					isBatchRequired = row.isBatchRequired === true;
				}
			} else if (cats.length > 0) {
				categoryIdStr = String(cats[0].id);
				isBatchRequired = false;
			}
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!itemName?.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		const catId = Number(categoryIdStr);
		if (!Number.isFinite(catId) || categoryIdStr === '') {
			toastService.addToast(
				m.item_master_category_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (
			catId === CategoryEnum.PHARMACY_SUPPLY &&
			!pharmacyGenericIdStr.trim()
		) {
			toastService.addToast(
				m.item_master_pharmacy_generic_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;

		isSubmitting = true;
		try {
			if (!itemMasterApi) throw new Error('Hospital context missing');
			const pharmacyGenericId =
				catId === CategoryEnum.PHARMACY_SUPPLY &&
				pharmacyGenericIdStr.trim() !== '' &&
				Number.isFinite(Number(pharmacyGenericIdStr))
					? Number(pharmacyGenericIdStr)
					: null;
			const manufacturerId =
				manufacturerIdStr.trim() !== '' &&
				Number.isFinite(Number(manufacturerIdStr))
					? Number(manufacturerIdStr)
					: null;
			const itemUnitMasterIds = itemUnitMasterIdStrs
				.map((s) => Number(s))
				.filter((n) => Number.isFinite(n) && n > 0);
			if (itemUnitMasterIds.length >= 1) {
				const defN = Number(defaultItemUnitMasterIdStr);
				if (
					!defaultItemUnitMasterIdStr ||
					!Number.isFinite(defN) ||
					!itemUnitMasterIds.includes(defN)
				) {
					toastService.addToast(
						m.item_master_unit_conversions_default_required(),
						StatusColorEnum.ERROR
					);
					return;
				}
			}
			const body: Record<string, unknown> = {
				itemName: itemName.trim(),
				categoryId: catId,
				itemCode: itemCode.trim() || null,
				barcode: barcode.trim() || null,
				pharmacyGenericId,
				manufacturerId,
				itemUnitMasterIds,
				description: description.trim() || null,
				remark: remark.trim() || null,
				statusId,
				isBatchRequired
			};
			if (itemUnitMasterIds.length > 0) {
				body.defaultItemUnitMasterId = Number(
					defaultItemUnitMasterIdStr
				);
			}
			if (modalState.mode === 'create') {
				const res = await fetch(itemMasterApi, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(body)
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Create failed: ${res.status}`);
				}
				toastService.addToast(
					m.item_master_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (modalState.editItem) {
				const res = await fetch(itemMasterApi, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ ...body, id: modalState.editItem.id })
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastService.addToast(
					m.item_master_updated(),
					StatusColorEnum.SUCCESS
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if isLoading}
	<p class="text-sm opacity-70">{m.loading()}</p>
{:else}
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div class="flex flex-col gap-4">
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-name" className="shrink-0 sm:w-40"
					>{m.item_master_item_name()}
					<span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiInputField
						id="im-name"
						bind:value={itemName}
						inputType="text"
						inputPlaceholderText={m.item_master_item_name_placeholder()}
						required
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-cat" className="shrink-0 sm:w-40"
					>{m.service_item_category_label()}
					<span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiSelect
						id="im-cat"
						bind:value={categoryIdStr}
						optionHeader=""
					>
						{#each categories as c (c.id)}
							<option value={String(c.id)}
								>{c.categoryName ?? c.id}</option
							>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			{#if isPharmacySupplyCategory}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="im-pharm-gen"
						className="shrink-0 sm:w-40"
						>{m.item_master_pharmacy_generic()}
						<span class="text-error">*</span></DaisyUiLabel
					>
					<div class="max-w-lg flex-1">
						<DaisyUISearchSelect
							inputId="im-pharm-gen"
							bind:value={pharmacyGenericIdStr}
							placeholder={m.item_master_pharmacy_generic_placeholder()}
							searchFn={searchPharmacyGenerics}
							getLabelForValue={getPharmacyGenericLabelForValue}
							invalidateKey={`${hospitalId}-${categoryIdStr}`}
							className="w-full"
						/>
					</div>
				</div>
			{/if}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="im-mfr"
					className="shrink-0 sm:w-40"
					>{m.item_master_manufacturer()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUISearchSelect
						inputId="im-mfr"
						bind:value={manufacturerIdStr}
						placeholder={m.item_master_manufacturer_placeholder()}
						searchFn={searchManufacturers}
						getLabelForValue={getManufacturerLabelForValue}
						invalidateKey={`${hospitalId}-mfr`}
						className="w-full"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-code" className="shrink-0 sm:w-40"
					>{m.item_master_code()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiInputField
						id="im-code"
						bind:value={itemCode}
						inputType="text"
						inputPlaceholderText={m.item_master_code_placeholder()}
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="im-barcode" className="shrink-0 sm:w-40"
					>{m.item_master_barcode()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiInputField
						id="im-barcode"
						bind:value={barcode}
						inputType="text"
						inputPlaceholderText={m.item_master_barcode_placeholder()}
					/>
					<p class="mt-1 text-xs opacity-70">
						{m.item_master_barcode_scan_hint()}
					</p>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.item_master_batch_required()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<label class="flex cursor-pointer items-start gap-2">
						<DaisyUiCheckbox bind:checked={isBatchRequired} />
						<span class="text-sm">{m.item_master_batch_required_help()}</span>
					</label>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.item_master_description()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiTextarea bind:value={description} />
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-2 sm:w-40"
					>{m.remark()}</DaisyUiLabel
				>
				<div class="max-w-lg flex-1">
					<DaisyUiTextarea bind:value={remark} />
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 pt-1 sm:w-40"
					>{m.item_master_unit_conversions()}</DaisyUiLabel
				>
				<div class="max-w-lg min-w-0 flex-1">
					{#if itemUnitMasters.length === 0}
						<p class="text-sm opacity-70">—</p>
					{:else}
						<DaisyUiInputField
							id="im-unit-filter"
							bind:value={unitConversionFilter}
							inputType="text"
							inputPlaceholderText={m.item_master_unit_conversions_search_placeholder()}
							className="mb-2"
						/>
						<div
							class="max-h-44 overflow-auto rounded-lg border border-base-300 p-2"
						>
							<div
								class="border-base-300/80 text-base-content/70 grid grid-cols-[2.5rem_2.5rem_1fr] gap-x-2 border-b pb-1 text-xs font-medium"
							>
								<span class="text-center"
									>{m.item_master_unit_conversions_include()}</span
								>
								<span class="text-center"
									>{m.item_master_unit_conversions_default()}</span
								>
								<span class="sr-only">Conversion</span>
							</div>
							{#if filteredItemUnitMasters.length === 0}
								<p class="text-sm opacity-70">
									{m.item_master_unit_conversions_no_filter_match()}
								</p>
							{/if}
							{#each filteredItemUnitMasters as opt (opt.id)}
								<div
									class="border-base-300/50 grid grid-cols-[2.5rem_2.5rem_1fr] items-center gap-x-2 border-b border-dotted py-1.5 last:border-0"
								>
									<label
										class="flex cursor-pointer justify-center"
									>
										<DaisyUiCheckbox
											checked={itemUnitMasterIdStrs.includes(
												String(opt.id)
											)}
											onCheckedChange={() =>
												toggleItemUnitMaster(opt.id)}
										/>
									</label>
									<div class="flex justify-center">
										<input
											type="radio"
											name={unitDefaultRadioName}
											class="d-radio d-radio-sm"
											value={String(opt.id)}
											disabled={!itemUnitMasterIdStrs.includes(
												String(opt.id)
											)}
											bind:group={defaultItemUnitMasterIdStr}
										/>
									</div>
									<span
										class="text-sm font-mono break-all"
										title={opt.conversionDisplay}
										>{opt.conversionDisplay}</span
									>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel className="shrink-0 sm:w-40">{m.status()}</DaisyUiLabel>
				<div class="flex max-w-lg flex-1 flex-wrap items-center gap-2">
					<label class="flex cursor-pointer items-center gap-2">
						<DaisyUiCheckbox bind:checked={formActive} />
						<span class="text-sm opacity-80">{m.active_label()}</span>
					</label>
				</div>
			</div>
		</div>
		<div
			class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-ghost"
				onClick={() => cancel()}
			>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton
				type="submit"
				className="d-btn-primary"
				loading={isSubmitting}
			>
				{isEdit ? m.update() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
