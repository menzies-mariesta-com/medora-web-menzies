<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import ConsumptionLineDialogContent from '$lib/component/own/local/private/heka/inventory/department-consumption/ConsumptionLineDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import type { ConsumptionDraftLine } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { DepartmentConsumptionDetailLine } from '$lib/model/type/heka/department-consumption-detail.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null }).selectedInventoryFromStoreId ??
			null
	);

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let storeId = $state<number | null>(null);
	let remarks = $state('');
	let lines = $state<ConsumptionDraftLine[]>([]);

	let editingLineKey = $state<string | null>(null);
	let draftLineModal = $state<ConsumptionDraftLine | null>(null);
	let submitting = $state(false);

	const listPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/department-consumption' as const)
	);

	function newLine(): ConsumptionDraftLine {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			quantity: '1',
			iumList: [],
			itemUnitMasterId: null,
			batchId: null,
			batchOptions: []
		};
	}

	function purchaseUnitForLine(line: ConsumptionDraftLine): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.purchaseUnitId ?? null;
	}

	async function loadStores() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`,
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
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = await res.json();
		return (j.data ?? []).map((x: { itemName?: string | null; id: number }) => ({
			label: x.itemName ?? '—',
			value: String(x.id)
		}));
	}

	async function openCreateLine() {
		editingLineKey = null;
		draftLineModal = newLine();
		const dl = draftLineModal;
		if (!dl) return;
		await dialogService.open({
			title: m.inv_dc_add_line(),
			modalClassName: 'max-w-2xl',
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
			batchOptions: [...line.batchOptions]
		};
		const dl = draftLineModal;
		if (!dl) return;
		await dialogService.open({
			title: m.inv_dc_edit_line(),
			modalClassName: 'max-w-2xl',
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
		const row = { ...draftLineModal };
		if (editingLineKey) {
			lines = lines.map((x) => (x.key === editingLineKey ? row : x));
		} else {
			lines = [...lines, row];
		}
	}

	function removeLine(key: string) {
		lines = lines.filter((x) => x.key !== key);
	}

	const columns: MariTableColumn<DepartmentConsumptionDetailLine>[] = [
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
			const q = ln.quantity.trim();
			if (
				ln.itemId == null ||
				uid == null ||
				ln.batchId == null ||
				!q ||
				Number(q) <= 0
			) {
				toast.addErrorToast(m.inv_dc_new_title(), new Error(m.inv_common_quantity()));
				return;
			}
			payloadLines.push({
				itemId: ln.itemId,
				quantity: q,
				unitId: uid,
				batchId: ln.batchId
			});
		}
		if (payloadLines.length === 0) {
			toast.addErrorToast(m.inv_dc_new_title(), new Error(m.inv_dc_lines_title()));
			return;
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption`,
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
				`/heka/hospital/${hospitalId}/home/inventory/department-consumption/${encodeURIComponent(row.id)}`
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
	<DaisyUiButton type="button" className="d-btn-ghost d-btn-sm" onClick={() => void goto(listPath)}>
		<LucideArrowLeft className="mr-1 size-4" />
	</DaisyUiButton>
	<h1 class="text-xl font-semibold">{m.inv_dc_new_title()}</h1>
</div>

<DaisyUiCard className="mb-4">
	<DaisyUiCardBody className="grid gap-3 sm:max-w-3xl">
		<DaisyUiCardBodyTitle>{m.inv_dc_store()}</DaisyUiCardBodyTitle>
		<div class="flex flex-col gap-6 sm:flex-row sm:items-start">
			<div class="min-w-0 flex-1">
				<DaisyUiLabel className="text-xs">{m.inv_nav_from_store()}</DaisyUiLabel>
				<input
					type="text"
					readonly
					disabled
					class="d-input d-input-bordered mt-1 w-full text-sm"
					value={
						selectedInventoryFromStoreId != null
							? stores.find((s) => s.id === selectedInventoryFromStoreId)?.storeName?.trim() || '—'
							: '—'
					}
					aria-label={m.inv_nav_from_store()}
				/>
				{#if selectedInventoryFromStoreId == null}
					<div class="mt-2 d-alert d-alert-warning text-sm" role="status">
						{m.inv_inventory_from_store_topbar_hint()}
					</div>
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<DaisyUiLabel className="text-xs">{m.inv_dept_indent_remarks()}</DaisyUiLabel>
				<input
					type="text"
					class="d-input d-input-bordered mt-1 w-full text-sm"
					placeholder={m.inv_dept_indent_remarks()}
					bind:value={remarks}
				/>
			</div>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>

<DaisyUiCard className="mb-4">
	<DaisyUiCardBody>
		<div class="mb-2 flex items-center justify-between gap-2">
			<DaisyUiCardBodyTitle>{m.inv_dc_lines_title()}</DaisyUiCardBodyTitle>
			<div class="flex items-center justify-end gap-2">
				<DaisyUiTooltip tooltipText={m.inv_dc_add_line()} className="d-tooltip-ghost">
					<DaisyUiButton
						type="button"
						className="d-btn d-btn-primary d-btn-square d-btn-outline"
						disabled={submitting || storeId == null}
						aria-label={m.inv_dc_add_line()}
						onClick={() => void openCreateLine()}
					>
						<LucidePlus className="size-4" />
					</DaisyUiButton>
				</DaisyUiTooltip>
				<DaisyUiButton
					type="button"
					className="d-btn d-btn-primary"
					disabled={submitting || storeId == null}
					onClick={() => void submitConsumption()}
				>
					{m.inv_dc_submit_for_approval()}
				</DaisyUiButton>
			</div>
		</div>
		<div class="h-[420px] min-h-0">
			<MariTable
				columns={columns as MariTableColumn[]}
				rows={lines.map((ln) => ({
					id: 0,
					consumptionId: '',
					itemId: ln.itemId ?? 0,
					quantity: ln.quantity,
					unitId: purchaseUnitForLine(ln) ?? 0,
					batchId: ln.batchId ?? 0,
					remarks: null,
					itemName: ln.itemLabel,
					unitName:
						ln.iumList.find((u) => u.id === ln.itemUnitMasterId)?.conversionDisplay ?? '—',
					batchNo: ln.batchOptions.find((b) => b.value === ln.batchId)?.label ?? '—'
				}))}
				showRefreshButton={false}
				enableColumnFilters={true}
				showRowActions={true}
				actionsVariant="none"
			>
				{#snippet rowActions(_row, index)}
					{@const ln = lines[index]}
					<div class="flex flex-row items-center justify-center gap-1">
						<DaisyUiTooltip
							tooltipText={m.inv_line_items_tooltip_edit()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								type="button"
								className="d-btn-sm d-btn-ghost d-btn-square text-accent"
								disabled={!ln}
								onClick={() => {
									if (ln) void openEditLine(ln);
								}}
							>
								<LucidePencil className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
						<DaisyUiTooltip
							tooltipText={m.inv_common_remove_line()}
							className="d-tooltip-error d-tooltip-right"
						>
							<DaisyUiButton
								type="button"
								className="d-btn-sm d-btn-ghost d-btn-square text-error"
								disabled={!ln}
								onClick={() => {
									if (ln) removeLine(ln.key);
								}}
							>
								<LucideTrash2 className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					</div>
				{/snippet}
			</MariTable>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
