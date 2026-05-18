<script lang="ts">
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import type { BranchPricingConfigDto } from '$lib/model/type/heka/grn-pricing-config.type';
	import { m } from '$lib/paraglide/messages';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { computeGrnLinePricesPreview } from '$lib/tool/inventory/grn-pricing-preview.util';

	let {
		draft,
		disableUnlessItem = false,
		pricingConfig = null,
		/** When false (default), parents should toggle true when the modal opens so values normalize once. */
		open = false
	}: {
		draft: any;
		disableUnlessItem?: boolean;
		pricingConfig?: BranchPricingConfigDto | null;
		open?: boolean;
	} = $props();

	const GRN_NUMERIC_FIELD_KEYS = [
		'receivedQty',
		'purchasePrice',
		'freeQty',
		'discountPercent',
		'discountAmount',
		'taxPercent',
		'taxAmount',
		'salePriceOverride',
		'empSalePriceOverride'
	] as const;

	let prevOpen = false;
	let discountMode = $state<'percent' | 'amount'>('percent');
	let taxMode = $state<'percent' | 'amount'>('percent');

	$effect(() => {
		const nowOpen = open;
		if (nowOpen && !prevOpen && draft) {
			trimInventoryDraftNumericFieldsInPlace(
				draft as Record<string, unknown>,
				GRN_NUMERIC_FIELD_KEYS
			);
			discountMode =
				Number(draft.discountAmount) > 0 ? 'amount' : 'percent';
			taxMode = Number(draft.taxAmount) > 0 ? 'amount' : 'percent';
		}
		prevOpen = nowOpen;
	});

	const itemLocked = $derived(
		disableUnlessItem && draft?.itemId == null
	);

	const saleManual = $derived(
		pricingConfig?.saleManualOnGrnLine === true
	);
	const empManual = $derived(
		pricingConfig?.empManualOnGrnLine === true
	);
	const showAutoPreview = $derived(
		pricingConfig != null && !saleManual && !empManual
	);

	const pricePreview = $derived.by(() => {
		if (!pricingConfig || !draft) return null;
		const recv = Number(draft.receivedQty);
		const purch = Number(draft.purchasePrice);
		if (!Number.isFinite(recv) || recv <= 0 || !Number.isFinite(purch)) {
			return null;
		}
		const freeQ = Number(draft.freeQty);
		return computeGrnLinePricesPreview(pricingConfig, {
			receivedQty: recv,
			freeQty: Number.isFinite(freeQ) && freeQ > 0 ? freeQ : 0,
			purchaseUnitPrice: purch,
			discountAmount: Number(draft.discountAmount) || 0,
			discountPercent: Number(draft.discountPercent) || 0,
			taxAmount: Number(draft.taxAmount) || 0,
			taxPercent: Number(draft.taxPercent) || 0,
			salePriceOverride: draft.salePriceOverride,
			empSalePriceOverride: draft.empSalePriceOverride
		});
	});

	// Free unit picker should show *item unit master rows* (conversionDisplay), like PR.
	const freeUnitMasterOptions = $derived.by(() => {
		const list = (draft?.iumList ?? []) as Array<{
			id?: number | null;
			conversionDisplay?: string | null;
		}>;
		if (!Array.isArray(list) || list.length === 0) return [];
		return list
			.filter((x) => typeof x?.id === 'number')
			.map((x) => ({
				label:
					String(x.conversionDisplay ?? '').trim() || String(x.id),
				value: String(x.id)
			}));
	});

	function setDiscountMode(next: 'percent' | 'amount') {
		discountMode = next;
		if (!draft) return;
		if (next === 'percent') draft.discountAmount = '0';
		else draft.discountPercent = '0';
	}

	function setTaxMode(next: 'percent' | 'amount') {
		taxMode = next;
		if (!draft) return;
		if (next === 'percent') draft.taxAmount = '0';
		else draft.taxPercent = '0';
	}
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	<div>
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_grn_line_received_qty()}</DaisyUiLabel
		>
		<input
			type="number"
			class="d-input-bordered d-input w-full"
			value={draft.receivedQty == null || draft.receivedQty === ''
				? ''
				: String(draft.receivedQty)}
			oninput={(e) => {
				draft.receivedQty = e.currentTarget.value;
			}}
			step="1"
			min="0"
			disabled={itemLocked}
			aria-label={m.inv_grn_line_received_qty()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_stock_col_batch()}</DaisyUiLabel
		>
		<input
			type="text"
			class="d-input-bordered d-input w-full"
			bind:value={draft.batchNo}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_batch()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_stock_col_expiry()}</DaisyUiLabel
		>
		<input
			type="date"
			class="d-input-bordered d-input w-full"
			bind:value={draft.expiryDate}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_expiry()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_stock_col_price()}</DaisyUiLabel
		>
		<input
			type="number"
			class="d-input-bordered d-input w-full"
			value={draft.purchasePrice == null || draft.purchasePrice === ''
				? ''
				: String(draft.purchasePrice)}
			oninput={(e) => {
				draft.purchasePrice = e.currentTarget.value;
			}}
			step="0.01"
			min="0"
			disabled={itemLocked}
			aria-label={m.inv_stock_col_price()}
		/>
	</div>
	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_grn_free_qty()}</DaisyUiLabel
		>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<input
				type="number"
				class="d-input-bordered d-input w-full"
				value={draft.freeQty == null || draft.freeQty === ''
					? ''
					: String(draft.freeQty)}
				oninput={(e) => {
					draft.freeQty = e.currentTarget.value;
				}}
				step="1"
				min="0"
				disabled={itemLocked}
				aria-label={m.inv_grn_free_qty()}
			/>
			<DaisyUISearchSelect
				value={draft?.freeUnitIumId != null
					? String(draft.freeUnitIumId)
					: ''}
				options={freeUnitMasterOptions}
				placeholder={m.inv_line_modal_select_conversion()}
				onChange={(v: string) => {
					const id = v ? Number(v) : null;
					draft.freeUnitIumId = id;
					const list = (draft?.iumList ?? []) as Array<{
						id?: number | null;
						purchaseUnitId?: number | null;
					}>;
					const ium =
						id != null
							? (list.find(
									(x) => typeof x?.id === 'number' && x.id === id
								) ?? null)
							: null;
					draft.freeUnitId = ium?.purchaseUnitId ?? null;
				}}
				className="w-full"
				disabled={itemLocked || freeUnitMasterOptions.length === 0}
			/>
		</div>
	</div>
	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80">
			{discountMode === 'amount'
				? m.inv_grn_discount_amount()
				: m.inv_grn_discount_percent()}
		</DaisyUiLabel>
		<div class="flex items-center gap-3">
			<div class="flex-1">
				{#if discountMode === 'amount'}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.discountAmount == null ||
						draft.discountAmount === ''
							? ''
							: String(draft.discountAmount)}
						oninput={(e) => {
							draft.discountAmount = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						disabled={itemLocked}
						aria-label={m.inv_grn_discount_amount()}
					/>
				{:else}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.discountPercent == null ||
						draft.discountPercent === ''
							? ''
							: String(draft.discountPercent)}
						oninput={(e) => {
							draft.discountPercent = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						disabled={itemLocked}
						aria-label={m.inv_grn_discount_percent()}
					/>
				{/if}
			</div>
			<label
				class="flex shrink-0 items-center gap-2 text-xs opacity-80"
			>
				<span>%</span>
				<input
					type="checkbox"
					class="d-toggle d-toggle-accent"
					checked={discountMode === 'amount'}
					disabled={itemLocked}
					aria-label="Toggle discount percent/amount"
					onchange={(e) => {
						const checked = (e.currentTarget as HTMLInputElement)
							.checked;
						setDiscountMode(checked ? 'amount' : 'percent');
					}}
				/>
				<span>$</span>
			</label>
		</div>
	</div>
	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80">
			{taxMode === 'amount'
				? m.inv_grn_tax_amount()
				: m.inv_grn_tax_percent()}
		</DaisyUiLabel>
		<div class="flex items-center gap-3">
			<div class="flex-1">
				{#if taxMode === 'amount'}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.taxAmount == null || draft.taxAmount === ''
							? ''
							: String(draft.taxAmount)}
						oninput={(e) => {
							draft.taxAmount = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						disabled={itemLocked}
						aria-label={m.inv_grn_tax_amount()}
					/>
				{:else}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.taxPercent == null || draft.taxPercent === ''
							? ''
							: String(draft.taxPercent)}
						oninput={(e) => {
							draft.taxPercent = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						disabled={itemLocked}
						aria-label={m.inv_grn_tax_percent()}
					/>
				{/if}
			</div>
			<label
				class="flex shrink-0 items-center gap-2 text-xs opacity-80"
			>
				<span>%</span>
				<input
					type="checkbox"
					class="d-toggle d-toggle-primary"
					checked={taxMode === 'amount'}
					disabled={itemLocked}
					aria-label="Toggle tax percent/amount"
					onchange={(e) => {
						const checked = (e.currentTarget as HTMLInputElement)
							.checked;
						setTaxMode(checked ? 'amount' : 'percent');
					}}
				/>
				<span>$</span>
			</label>
		</div>
	</div>
	{#if saleManual || empManual}
		<div class="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#if saleManual}
				<div>
					<DaisyUiLabel className="text-xs opacity-80"
						>{m.inv_grn_sale_price()}</DaisyUiLabel
					>
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.salePriceOverride == null ||
						draft.salePriceOverride === ''
							? ''
							: String(draft.salePriceOverride)}
						oninput={(e) => {
							draft.salePriceOverride = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						disabled={itemLocked}
						aria-label={m.inv_grn_sale_price()}
					/>
				</div>
			{/if}
			{#if empManual}
				<div>
					<DaisyUiLabel className="text-xs opacity-80"
						>{m.inv_grn_emp_sale_price()}</DaisyUiLabel
					>
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.empSalePriceOverride == null ||
						draft.empSalePriceOverride === ''
							? ''
							: String(draft.empSalePriceOverride)}
						oninput={(e) => {
							draft.empSalePriceOverride = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						disabled={itemLocked}
						aria-label={m.inv_grn_emp_sale_price()}
					/>
				</div>
			{/if}
		</div>
	{:else if showAutoPreview && pricePreview}
		<div class="sm:col-span-2 rounded-lg border border-base-300 p-3 text-sm">
			<p class="text-xs font-semibold opacity-80">
				{m.inv_grn_price_preview()}
			</p>
			<p class="mt-1">
				{m.inv_grn_sale_price()}: {pricePreview.salePerPurch}
			</p>
			<p>
				{m.inv_grn_emp_sale_price()}: {pricePreview.empPerPurch}
			</p>
		</div>
	{/if}
</div>
