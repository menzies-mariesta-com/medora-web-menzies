<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { issueQtyToPurchaseQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';
	import { m } from '$lib/paraglide/messages';

	type LookupOption = { id: number; name: string | null };

	type InitialEdit = {
		id: number;
		storeId: number;
		itemId: number;
		itemUnitMasterId: number | null;
		minQtyIssue: string;
	};

	let {
		confirm,
		cancel,
		mode,
		hospitalId,
		stores,
		items,
		loading,
		error,
		initialEdit,
		onSave
	}: DialogSlotProps & {
		mode: 'create' | 'edit';
		hospitalId: string;
		stores: LookupOption[];
		items: LookupOption[];
		loading: boolean;
		error: string | null;
		initialEdit?: InitialEdit | null;
		onSave: (payload: {
			replaceRowId?: number;
			storeId: number;
			itemId: number;
			itemUnitMasterId: number;
			minQtyPurchase: string;
		}) => Promise<void>;
	} = $props();

	let storeId = $state('');
	let itemId = $state('');
	let itemUnitMasterId = $state<number | null>(null);
	let iumList = $state<ConsumptionDraftLineIum[]>([]);
	let minQtyPurchase = $state('');
	let iumsLoading = $state(false);

	let submitting = $state(false);
	let touched = $state(false);

	const parsedStoreId = $derived(Number(storeId));
	const parsedItemId = $derived(Number(itemId));

	const storeValid = $derived(
		Number.isFinite(parsedStoreId) && parsedStoreId > 0
	);
	const itemValid = $derived(
		Number.isFinite(parsedItemId) && parsedItemId > 0
	);

	const chosenIum = $derived(
		itemUnitMasterId != null
			? (iumList.find((u) => u.id === itemUnitMasterId) ?? null)
			: null
	);

	const purchaseQtyParsed = $derived(
		Number(String(minQtyPurchase ?? '').trim())
	);

	const minQtyPurchaseValid = $derived(
		String(minQtyPurchase ?? '').trim().length > 0 &&
			Number.isFinite(purchaseQtyParsed) &&
			purchaseQtyParsed >= 0
	);

	const iumValid = $derived(
		itemUnitMasterId != null && chosenIum != null
	);

	const formValid = $derived(
		storeValid && itemValid && iumValid && minQtyPurchaseValid
	);

	const storeOptions = $derived(
		stores.map((s) => ({ label: s.name ?? '—', value: String(s.id) }))
	);
	const itemOptions = $derived(
		items.map((it) => ({
			label: it.name ?? '—',
			value: String(it.id)
		}))
	);

	async function hydrateItemIums(
		forItemId: number,
		presetIumId?: number | null
	): Promise<ConsumptionDraftLineIum | null> {
		if (!hospitalId || !Number.isFinite(forItemId) || forItemId <= 0)
			return null;
		iumsLoading = true;
		try {
			const [detailRes, iumRes] = await Promise.all([
				fetch(
					`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?id=${forItemId}`,
					{ method: 'GET' }
				),
				fetch(
					`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
					{ method: 'GET' }
				)
			]);
			const detail = (await detailRes.json()) as {
				itemUnitMasterIds?: number[];
				defaultItemUnitMasterId?: number | null;
			};
			const allIum =
				(await iumRes.json()) as ConsumptionDraftLineIum[];
			const allowed = new Set(detail.itemUnitMasterIds ?? []);
			const allowedRows = allIum.filter((u) => allowed.has(u.id));
			iumList = allowedRows;
			const pref =
				presetIumId != null
					? allowedRows.find((u) => u.id === presetIumId)
					: undefined;
			const def = detail.defaultItemUnitMasterId;
			let chosen: ConsumptionDraftLineIum | undefined =
				pref ??
				(def != null
					? allowedRows.find((u) => u.id === def)
					: undefined);
			if (!chosen && allowedRows.length > 0) chosen = allowedRows[0];
			itemUnitMasterId = chosen?.id ?? null;
			return chosen ?? null;
		} finally {
			iumsLoading = false;
		}
	}

	function applyIssueQtyAsPurchaseDraft(
		minQtyIssue: string,
		ium: ConsumptionDraftLineIum | null
	) {
		const raw = String(minQtyIssue ?? '').trim();
		if (!raw || !ium) {
			minQtyPurchase = raw;
			return;
		}
		const n = issueQtyToPurchaseQtyNumber(
			raw,
			String(ium.purchaseConversionFactor),
			String(ium.issueConversionFactor)
		);
		minQtyPurchase =
			n != null && Number.isFinite(n) ? String(Math.round(n)) : raw;
	}

	let editSeedDone = $state(false);
	$effect(() => {
		if (
			mode !== 'edit' ||
			initialEdit == null ||
			!hospitalId ||
			editSeedDone
		)
			return;
		editSeedDone = true;
		storeId = String(initialEdit.storeId);
		itemId = String(initialEdit.itemId);
		void (async () => {
			const resolved = await hydrateItemIums(
				initialEdit.itemId,
				initialEdit.itemUnitMasterId
			);
			applyIssueQtyAsPurchaseDraft(initialEdit.minQtyIssue, resolved);
		})();
	});

	async function onItemChange(v: string) {
		itemId = v;
		itemUnitMasterId = null;
		iumList = [];
		minQtyPurchase = '';
		touched = true;
		const id = Number(v);
		if (Number.isFinite(id) && id > 0) await hydrateItemIums(id);
	}

	async function handleSubmit() {
		touched = true;
		if (!formValid || submitting || itemUnitMasterId == null) return;
		submitting = true;
		try {
			await onSave({
				replaceRowId:
					mode === 'edit' && initialEdit ? initialEdit.id : undefined,
				storeId: parsedStoreId,
				itemId: parsedItemId,
				itemUnitMasterId,
				minQtyPurchase: String(Math.floor(purchaseQtyParsed))
			});
			confirm();
		} finally {
			submitting = false;
		}
	}
</script>

<div class="space-y-4">
	{#if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{/if}

	<div class="space-y-1">
		<label for="inv-reorder-level-store" class="font-semibold">
			{m.inv_reorder_level_store()}
		</label>
		<SearchSelect
			inputId="inv-reorder-level-store"
			value={storeId}
			options={storeOptions}
			disabled={loading || submitting}
			placeholder={m.inv_reorder_level_search_placeholder()}
			className="w-full"
			onChange={(v: string) => {
				storeId = v;
				touched = true;
			}}
		/>
		{#if touched && !storeValid}
			<p class="text-sm text-error">{m.toast_field_required()}</p>
		{/if}
	</div>

	<div class="space-y-1">
		<label for="inv-reorder-level-item" class="font-semibold">
			{m.inv_reorder_level_item()}
		</label>
		<SearchSelect
			inputId="inv-reorder-level-item"
			value={itemId}
			options={itemOptions}
			disabled={loading || submitting}
			placeholder={m.inv_reorder_level_search_placeholder()}
			className="w-full"
			onChange={(v: string) => void onItemChange(v)}
		/>
		{#if touched && !itemValid}
			<p class="text-sm text-error">{m.toast_field_required()}</p>
		{/if}
	</div>

	<div class="space-y-1">
		<label for="inv-reorder-level-ium" class="font-semibold">
			{m.inv_common_unit()}
		</label>
		<select
			id="inv-reorder-level-ium"
			class="select-bordered select w-full"
			disabled={iumsLoading ||
				submitting ||
				!itemValid ||
				iumList.length === 0}
			value={itemUnitMasterId != null ? String(itemUnitMasterId) : ''}
			onchange={(e) => {
				const v = (e.currentTarget as HTMLSelectElement).value;
				itemUnitMasterId = v ? Number(v) : null;
				touched = true;
			}}
		>
			<option value="">—</option>
			{#each iumList as u (u.id)}
				<option value={String(u.id)}
					>{u.conversionDisplay ?? `#${u.id}`}</option
				>
			{/each}
		</select>
		{#if touched && !iumValid && itemValid}
			<p class="text-sm text-error">{m.toast_field_required()}</p>
		{/if}
	</div>

	<div class="space-y-1">
		<label for="inv-reorder-level-min-qty" class="font-semibold">
			{m.inv_reorder_level_min_qty()}
			{#if chosenIum?.purchaseUnitName?.trim()}
				<span class="font-normal opacity-70">
					({chosenIum.purchaseUnitName.trim()})</span
				>
			{/if}
		</label>
		<p class="text-xs opacity-70">
			{m.inv_reorder_level_min_qty_conversion_hint()}
		</p>
		<input
			id="inv-reorder-level-min-qty"
			class="input-bordered input w-full"
			type="number"
			min="0"
			step="1"
			disabled={submitting || !iumValid}
			value={minQtyPurchase == null || minQtyPurchase === ''
				? ''
				: String(minQtyPurchase)}
			oninput={(e) => {
				minQtyPurchase = e.currentTarget.value;
				touched = true;
			}}
		/>
		{#if touched && !minQtyPurchaseValid}
			<p class="text-sm text-error">
				{m.toast_field_required()}
			</p>
		{/if}
	</div>

	<div class="modal-action flex justify-end gap-2 pt-2">
		<WashButton
			type="button"
			className="btn-ghost"
			disabled={submitting}
			onClick={() => cancel()}
		>
			{m.cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn-primary"
			disabled={!formValid || submitting}
			loading={submitting}
			onClick={() => void handleSubmit()}
		>
			{mode === 'edit'
				? m.inv_reorder_level_save()
				: m.inv_reorder_level_create()}
		</WashButton>
	</div>
</div>
