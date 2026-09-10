<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import ConsumptionLineDialogContent from '$lib/component/own/local/private/medora/inventory/department-consumption/ConsumptionLineDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import type { ConsumptionDraftLine } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { DepartmentConsumptionDetailLine } from '$lib/model/type/medora/department-consumption-detail.type';
	import { purchaseQtyToIssueQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let storeId = $state<number | null>(null);
	let remarks = $state('');
	let lines = $state<ConsumptionDraftLine[]>([]);

	let editingLineKey = $state<string | null>(null);
	let draftLineModal = $state<ConsumptionDraftLine | null>(null);
	let submitting = $state(false);

	const listPath = $derived(
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/department-consumption' as const
		)
	);

	function newLine(): ConsumptionDraftLine {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			iumList: [],
			itemUnitMasterId: null,
			batchAllocations: []
		};
	}

	function purchaseUnitForLine(
		line: ConsumptionDraftLine
	): number | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.purchaseUnitId ?? null;
	}

	function lineIumFactors(line: ConsumptionDraftLine): {
		pf: string;
		iff: string;
	} | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		if (!ium) return null;
		return {
			pf: ium.purchaseConversionFactor,
			iff: ium.issueConversionFactor
		};
	}

	function totalPurchaseQtyDisplay(
		line: ConsumptionDraftLine
	): string {
		let sum = 0;
		for (const a of line.batchAllocations) {
			const n = Number(String(a.qtyPurchase).trim());
			if (Number.isFinite(n) && n > 0) sum += n;
		}
		return sum > 0 ? String(sum) : '—';
	}

	function batchAllocationsSummary(
		line: ConsumptionDraftLine
	): string {
		const parts = line.batchAllocations
			.filter((a) => {
				const n = Number(String(a.qtyPurchase).trim());
				return Number.isFinite(n) && n > 0;
			})
			.map(
				(a) =>
					`${(a.batchNo ?? '').trim() || '—'} (${String(a.qtyPurchase).trim()})`
			);
		return parts.length > 0 ? parts.join('; ') : '—';
	}

	async function loadStores() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores?mode=allForPicker`,
			{ method: 'GET' }
		);
		stores = (await res.json()) as typeof stores;
	}

	$effect(() => {
		storeId = selectedInventoryFromStoreId;
	});

	async function searchItems(q: string) {
		const qEnc = encodeURIComponent(q.trim());
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = await res.json();
		return (j.data ?? []).map(
			(x: { itemName?: string | null; id: number }) => ({
				label: x.itemName ?? '—',
				value: String(x.id)
			})
		);
	}

	async function openCreateLine() {
		editingLineKey = null;
		draftLineModal = newLine();
		const dl = draftLineModal;
		if (!dl) return;
		await dialogService.open({
			title: m.inv_dc_add_line(),
			modalClassName: 'max-w-4xl',
			component: ConsumptionLineDialogContent,
			props: {
				hospitalId,
				storeId,
				draftLine: dl,
				searchItemsFn: searchItems,
				onPersist: persistDraftLineFromModal
			},
			onClose: () => {
				draftLineModal = null;
				editingLineKey = null;
			}
		});
	}

	async function openEditLine(line: ConsumptionDraftLine) {
		editingLineKey = line.key;
		draftLineModal = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList],
			batchAllocations: line.batchAllocations.map((a) => ({ ...a }))
		};
		const dl = draftLineModal;
		if (!dl) return;
		await dialogService.open({
			title: m.inv_dc_edit_line(),
			modalClassName: 'max-w-4xl',
			component: ConsumptionLineDialogContent,
			props: {
				hospitalId,
				storeId,
				draftLine: dl,
				searchItemsFn: searchItems,
				onPersist: persistDraftLineFromModal
			},
			onClose: () => {
				draftLineModal = null;
				editingLineKey = null;
			}
		});
	}

	function persistDraftLineFromModal() {
		if (!draftLineModal) return;
		const src = draftLineModal;
		const row: ConsumptionDraftLine = {
			...src,
			hits: [...src.hits],
			iumList: [...src.iumList],
			batchAllocations: src.batchAllocations.map((a) => ({ ...a }))
		};
		if (editingLineKey) {
			lines = lines.map((x) => (x.key === editingLineKey ? row : x));
		} else {
			lines = [...lines, row];
		}
	}

	function removeLine(key: string) {
		lines = lines.filter((x) => x.key !== key);
	}

	const columns: MenziesTableColumn<DepartmentConsumptionDetailLine>[] =
		[
			{
				id: 'item',
				header: m.inv_common_item(),
				field: 'itemName',
				format: (_v, r) => r.itemName ?? '—'
			},
			{
				id: 'qty',
				header: m.inv_common_quantity(),
				field: 'quantity',
				format: (_v, r) => String(r.quantity)
			},
			{
				id: 'unit',
				header: m.inv_common_unit(),
				field: 'unitName',
				format: (_v, r) => r.unitName ?? '—'
			},
			{
				id: 'batch',
				header: m.inv_dc_batch(),
				field: 'batchNo',
				format: (_v, r) => r.batchNo ?? '—'
			}
		];

	async function submitConsumption() {
		if (!hospitalId || storeId == null) return;
		const payloadLines: {
			itemId: number;
			quantity: string;
			unitId: number;
			batchId: number;
		}[] = [];
		for (const ln of lines) {
			const uid = purchaseUnitForLine(ln);
			const factors = lineIumFactors(ln);
			if (ln.itemId == null || uid == null || factors == null) {
				toast.addErrorToast(
					m.inv_dc_new_title(),
					new Error(m.inv_common_quantity())
				);
				return;
			}
			const { pf, iff } = factors;
			let lineHasQty = false;
			for (const a of ln.batchAllocations) {
				const q = a.qtyPurchase.trim();
				if (!q) continue;
				const n = Number(q);
				if (!Number.isFinite(n) || n <= 0) {
					toast.addErrorToast(
						m.inv_dc_new_title(),
						new Error(m.inv_common_quantity())
					);
					return;
				}
				lineHasQty = true;
				const need = purchaseQtyToIssueQtyNumber(q, pf, iff);
				if (need == null || need > Number(a.stockIssueQty) + 1e-6) {
					toast.addErrorToast(
						m.inv_dc_new_title(),
						new Error(m.inv_dc_batch_qty_exceeds_stock())
					);
					return;
				}
				payloadLines.push({
					itemId: ln.itemId,
					quantity: q,
					unitId: uid,
					batchId: a.batchId
				});
			}
			if (!lineHasQty) {
				toast.addErrorToast(
					m.inv_dc_new_title(),
					new Error(m.inv_common_quantity())
				);
				return;
			}
		}
		if (payloadLines.length === 0) {
			toast.addErrorToast(
				m.inv_dc_new_title(),
				new Error(m.inv_dc_lines_title())
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-consumption`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						storeId,
						remarks: remarks.trim() || null,
						lines: payloadLines
					})
				}
			);
			if (!res.ok) throw new Error(await res.text());
			const row = (await res.json()) as { id: string };
			await goto(
				`/medora/hospital/${hospitalId}/home/inventory/department-consumption/${encodeURIComponent(row.id)}`
			);
		} catch (e) {
			toast.addErrorToast(m.inv_dc_new_title(), e);
		} finally {
			submitting = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void loadStores();
	});
</script>

<div class="mb-4 flex flex-wrap items-center gap-2">
	<WashButton
		type="button"
		className="btn-ghost btn-sm"
		onClick={() => void goto(listPath)}
	>
		<LucideArrowLeft className="mr-1 size-4" />
	</WashButton>
	<h1 class="text-xl font-semibold">{m.inv_dc_new_title()}</h1>
</div>

<WashCard className="mb-4">
	<WashCardBody className="grid gap-3 sm:max-w-3xl">
		<WashCardBodyTitle>{m.inv_dc_store()}</WashCardBodyTitle>
		<div class="flex flex-col gap-6 sm:flex-row sm:items-start">
			<div class="min-w-0 flex-1">
				<label class="text-xs">{m.inv_nav_from_store()}</label>
				<input
					type="text"
					readonly
					disabled
					class="input-bordered input mt-1 w-full text-sm"
					value={selectedInventoryFromStoreId != null
						? stores
								.find((s) => s.id === selectedInventoryFromStoreId)
								?.storeName?.trim() || '—'
						: '—'}
					aria-label={m.inv_nav_from_store()}
				/>
				{#if selectedInventoryFromStoreId == null}
					<div
						class="mt-2 alert text-sm alert-warning"
						role="status"
					>
						{m.inv_inventory_from_store_topbar_hint()}
					</div>
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<label class="text-xs">{m.inv_dept_indent_remarks()}</label>
				<input
					type="text"
					class="input-bordered input mt-1 w-full text-sm"
					placeholder={m.inv_dept_indent_remarks()}
					bind:value={remarks}
				/>
			</div>
		</div>
	</WashCardBody>
</WashCard>

<div
	class="mb-4 flex flex-wrap items-center justify-end gap-3 border-t border-base-200 pt-6"
>
	<WashButton
		type="button"
		className="btn-primary btn-wide"
		disabled={submitting || storeId == null || lines.length === 0}
		onClick={() => void submitConsumption()}
	>
		{m.inv_dc_submit_for_approval()}
	</WashButton>
</div>

<WashCard className="mb-4">
	<WashCardBody>
		<div class="mb-2 flex items-center justify-between gap-2">
			<WashCardBodyTitle
				>{m.inv_dc_lines_title()}</WashCardBodyTitle
			>
			<div class="flex items-center justify-end gap-2">
				<WashTooltip
					tooltipText={m.inv_dc_add_line()}
					className="tooltip-ghost"
				>
					<WashButton
						type="button"
						className="btn btn-primary btn-square btn-outline"
						disabled={submitting || storeId == null}
						title={m.inv_dc_add_line()}
						onClick={() => void openCreateLine()}
					>
						<LucidePlus className="size-4" />
					</WashButton>
				</WashTooltip>
			</div>
		</div>
		<div class="h-[420px] min-h-0">
			<MenziesTable
				columns={columns as MenziesTableColumn[]}
				rows={lines.map((ln) => ({
					id: 0,
					consumptionId: '',
					itemId: ln.itemId ?? 0,
					quantity: totalPurchaseQtyDisplay(ln),
					unitId: purchaseUnitForLine(ln) ?? 0,
					batchId: ln.batchAllocations[0]?.batchId ?? 0,
					remarks: null,
					itemName: ln.itemLabel,
					unitName:
						ln.iumList.find((u) => u.id === ln.itemUnitMasterId)
							?.conversionDisplay ?? '—',
					batchNo: batchAllocationsSummary(ln)
				}))}
				showRefreshButton={false}
				enableColumnFilters={false}
				showRowActions={true}
				actionsVariant="none"
			>
				{#snippet rowActions(_row, index)}
					{@const ln = lines[index]}
					<div
						class="flex flex-row items-center justify-center gap-1"
					>
						<WashTooltip
							tooltipText={m.inv_line_items_tooltip_edit()}
							className="tooltip-accent"
						>
							<WashButton
								type="button"
								className="btn-ghost btn-sm text-accent"
								disabled={!ln}
								onClick={() => {
									if (ln) void openEditLine(ln);
								}}
							>
								<LucidePencil className="size-3.5" />
							</WashButton>
						</WashTooltip>
						<WashTooltip
							tooltipText={m.inv_common_remove_line()}
							className="tooltip-error"
						>
							<WashButton
								type="button"
								className="btn-ghost btn-sm text-error"
								disabled={!ln}
								onClick={() => {
									if (ln) removeLine(ln.key);
								}}
							>
								<LucideTrash2 className="size-3.5" />
							</WashButton>
						</WashTooltip>
					</div>
				{/snippet}
			</MenziesTable>
		</div>
	</WashCardBody>
</WashCard>
