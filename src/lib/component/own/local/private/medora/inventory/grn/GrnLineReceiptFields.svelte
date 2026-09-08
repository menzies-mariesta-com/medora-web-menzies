<script lang="ts">
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	let {
		draft,
		disableUnlessItem = false,
		/** When false (default), parents should toggle true when the modal opens so values normalize once. */
		open = false
	}: {
		draft: any;
		disableUnlessItem?: boolean;
		open?: boolean;
	} = $props();

	const GRN_NUMERIC_FIELD_KEYS = [
		'purchasedQty',
		'purchasePrice',
		'freeQty',
		'discountPercent',
		'discountAmount',
		'taxPercent',
		'taxAmount'
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
		<label class="text-xs opacity-80">{m.inv_grn_line_purchased_qty()}</label>
		<input
			type="number"
			class="input-bordered input w-full"
			value={draft.purchasedQty == null || draft.purchasedQty === ''
				? ''
				: String(draft.purchasedQty)}
			oninput={(e) => {
				draft.purchasedQty = e.currentTarget.value;
			}}
			step="1"
			min="0"
			disabled={itemLocked}
			aria-label={m.inv_grn_line_purchased_qty()}
		/>
	</div>
	<div>
		<label class="text-xs opacity-80">{m.inv_stock_col_batch()}</label>
		<input
			type="text"
			class="input-bordered input w-full"
			bind:value={draft.batchNo}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_batch()}
		/>
	</div>
	<div>
		<label class="text-xs opacity-80">{m.inv_stock_col_expiry()}</label>
		<input
			type="date"
			class="input-bordered input w-full"
			bind:value={draft.expiryDate}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_expiry()}
		/>
	</div>
	<div>
		<label class="text-xs opacity-80">{m.inv_stock_col_price()}</label>
		<input
			type="number"
			class="input-bordered input w-full"
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
		<label class="text-xs opacity-80">{m.inv_grn_free_qty()}</label>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<input
				type="number"
				class="input-bordered input w-full"
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
			<WashSearchSelect
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
		<label class="text-xs opacity-80">
			{discountMode === 'amount'
				? m.inv_grn_discount_amount()
				: m.inv_grn_discount_percent()}
		</label>
		<div class="flex items-center gap-3">
			<div class="flex-1">
				{#if discountMode === 'amount'}
					<input
						type="number"
						class="input-bordered input w-full"
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
						class="input-bordered input w-full"
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
					class="toggle toggle-accent"
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
		<label class="text-xs opacity-80">
			{taxMode === 'amount'
				? m.inv_grn_tax_amount()
				: m.inv_grn_tax_percent()}
		</label>
		<div class="flex items-center gap-3">
			<div class="flex-1">
				{#if taxMode === 'amount'}
					<input
						type="number"
						class="input-bordered input w-full"
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
						class="input-bordered input w-full"
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
					class="toggle toggle-primary"
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
</div>
