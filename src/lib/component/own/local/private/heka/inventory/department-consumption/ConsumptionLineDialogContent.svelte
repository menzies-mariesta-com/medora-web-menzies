<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import type { ConsumptionDraftLine } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { m } from '$lib/paraglide/messages';
	import { enrichItemSearchOptionsWithStock } from '$lib/tool/inventory/fetch-stock-on-hand-for-items.util';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	let {
		confirm,
		cancel,
		hospitalId,
		storeId,
		draftLine,
		searchItemsFn,
		onPersist
	}: DialogSlotProps & {
		hospitalId: string;
		storeId: number | null;
		draftLine: ConsumptionDraftLine;
		searchItemsFn: (q: string) => Promise<{ label: string; value: string }[]>;
		onPersist: () => void;
	} = $props();

	const toast = new ToastService();

	async function searchItemsWithStock(q: string) {
		const base = await searchItemsFn(q);
		if (!hospitalId || storeId == null) return base;
		return enrichItemSearchOptionsWithStock(hospitalId, base, storeId);
	}

	async function hydrateLineItemMeta(line: ConsumptionDraftLine, itemId: number) {
		if (!hospitalId) return;
		line.itemId = itemId;
		const [detailRes, iumRes] = await Promise.all([
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemId}`,
				{ method: 'GET' }
			),
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
				{ method: 'GET' }
			)
		]);
		const detail = (await detailRes.json()) as {
			itemName?: string | null;
			itemUnitMasterIds?: number[];
			defaultItemUnitMasterId?: number | null;
		};
		line.itemLabel = detail.itemName ?? '—';
		line.itemSearch = line.itemLabel;
		const allIum = (await iumRes.json()) as ConsumptionDraftLine['iumList'];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		const allowedRows = allIum.filter((u) => allowed.has(u.id));
		const def = detail.defaultItemUnitMasterId;
		let chosen: ConsumptionDraftLine['iumList'][number] | undefined =
			def != null ? allowedRows.find((u) => u.id === def) : undefined;
		/* Locked unit: prefer item default IUM; if unset or not in allowed list, use first allowed. */
		if (!chosen && allowedRows.length > 0) chosen = allowedRows[0];
		line.iumList = chosen ? [chosen] : [];
		line.itemUnitMasterId = chosen?.id ?? null;
		line.batchId = null;
		await refreshBatchOptions(line);
	}

	async function refreshBatchOptions(line: ConsumptionDraftLine) {
		line.batchOptions = [];
		line.batchId = null;
		if (!hospitalId || storeId == null || line.itemId == null) return;
		try {
			const ps = new URLSearchParams();
			ps.set('mode', 'lots');
			ps.set('storeId', String(storeId));
			ps.set('itemId', String(line.itemId));
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/stock?${ps}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const rows = (await res.json()) as {
				batchId: number;
				batchNo: string | null;
				expiryDate: string | null;
				quantity: string;
			}[];
			line.batchOptions = rows
				.filter((r) => Number(r.quantity) > 1e-9)
				.map((r) => ({
					value: r.batchId,
					label: `${r.batchNo ?? '—'} · ${r.expiryDate ?? '—'} · ${r.quantity}`,
					qty: r.quantity
				}));
		} catch (e) {
			toast.addErrorToast(m.inv_dc_batch(), e);
		}
	}

	async function onPickItem(itemId: number) {
		await hydrateLineItemMeta(draftLine, itemId);
	}

	function purchaseUnitId(line: ConsumptionDraftLine): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.purchaseUnitId ?? null;
	}

	let saving = $state(false);

	const lockedUnitLabel = $derived(
		draftLine.itemId == null
			? ''
			: (draftLine.iumList.find((u) => u.id === draftLine.itemUnitMasterId)
					?.conversionDisplay ??
					draftLine.iumList[0]?.conversionDisplay ??
					'')
	);

	async function handleSave() {
		const uid = purchaseUnitId(draftLine);
		const q = draftLine.quantity.trim();
		if (
			draftLine.itemId == null ||
			uid == null ||
			draftLine.batchId == null ||
			!q ||
			!Number.isFinite(Number(q)) ||
			Number(q) <= 0
		) {
			toast.addToast(m.inv_dc_edit_line(), StatusColorEnum.ERROR, m.inv_common_quantity());
			return;
		}
		saving = true;
		try {
			onPersist();
			confirm();
		} finally {
			saving = false;
		}
	}
</script>

<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_pr_line_item_search()}</DaisyUiLabel>
		<DaisyUISearchSelect
			value={draftLine.itemId ? String(draftLine.itemId) : ''}
			searchFn={searchItemsWithStock}
			invalidateKey={`${hospitalId}:${storeId ?? ''}`}
			onChange={(v: string) => {
				if (v) void onPickItem(Number(v));
			}}
			placeholder={m.inv_line_modal_search_item()}
			className="w-full"
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_unit()}</DaisyUiLabel>
		<input
			type="text"
			readonly
			disabled
			class="d-input d-input-bordered mt-1 w-full cursor-not-allowed opacity-90"
			value={lockedUnitLabel || '—'}
			title={lockedUnitLabel || undefined}
			aria-label={m.inv_common_unit()}
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_quantity()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draftLine.quantity}
			disabled={draftLine.itemId == null}
			aria-label={m.inv_common_quantity()}
		/>
	</div>

	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_dc_batch()}</DaisyUiLabel>
		<p class="mb-1 text-xs opacity-70">{m.inv_dc_modal_batch_help()}</p>
		<DaisyUISearchSelect
			value={draftLine.batchId != null ? String(draftLine.batchId) : ''}
			options={draftLine.batchOptions.map((b) => ({
				label: b.label,
				value: String(b.value)
			}))}
			onChange={(v: string) => {
				draftLine.batchId = v ? Number(v) : null;
			}}
			placeholder={m.inv_dc_select_batch()}
			className="w-full"
			disabled={draftLine.itemId == null || storeId == null}
		/>
	</div>
</div>

<div class="d-modal-action mt-6">
	<DaisyUiButton type="button" className="d-btn" disabled={saving} onClick={() => cancel()}>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton
		type="button"
		className="d-btn d-btn-primary"
		disabled={saving}
		onClick={() => void handleSave()}
	>
		{m.save()}
	</DaisyUiButton>
</div>
