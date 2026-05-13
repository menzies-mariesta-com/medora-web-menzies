<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import ReorderLevelFormDialogContent from '$lib/component/own/local/private/heka/inventory-setup/reorder-level/ReorderLevelFormDialogContent.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { trimMetricQtyDisplay } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { issueQtyToPurchaseQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	type ReorderLevelRow = {
		id: number;
		hospitalId: string;
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		minQty: string;
		itemUnitMasterId: number | null;
		purchaseConversionFactor?: string | null;
		issueConversionFactor?: string | null;
		purchaseUnitName?: string | null;
		issueUnitName?: string | null;
		createdAt: string;
		updatedAt: string;
	};

	type LookupOption = { id: number; name: string | null };
	type Lookups = { stores: LookupOption[]; items: LookupOption[] };

	type ReorderSavePayload = {
		replaceRowId?: number;
		storeId: number;
		itemId: number;
		itemUnitMasterId: number;
		minQtyPurchase: string;
	};

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let rows = $state<ReorderLevelRow[]>([]);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);

	let deletingById = $state<Record<number, boolean>>({});

	let lookups = $state<Lookups>({ stores: [], items: [] });
	let lookupsLoading = $state(false);
	let lookupsError = $state<string | null>(null);

	function apiBase(hid: string) {
		return `/api/heka/hospital/${hid}/home/inventory-setup/reorder-level`;
	}

	function formatReorderMinQty(row: ReorderLevelRow): string {
		const issueStr = trimMetricQtyDisplay(row.minQty);
		const iu = (row.issueUnitName ?? '').trim();
		const issueLbl = iu ? `${issueStr} ${iu}` : issueStr;
		const pf = row.purchaseConversionFactor?.trim();
		const itf = row.issueConversionFactor?.trim();
		const pu = (row.purchaseUnitName ?? '').trim();
		if (row.itemUnitMasterId == null || !pf || !itf || !pu) {
			return issueLbl;
		}
		const purch = issueQtyToPurchaseQtyNumber(row.minQty, pf, itf);
		if (purch == null) return issueLbl;
		const purchRounded = Math.round(purch);
		return `${purchRounded} ${pu} (${issueLbl})`;
	}

	async function loadLookups() {
		if (!hospitalId) return;
		lookupsLoading = true;
		lookupsError = null;
		try {
			const res = await fetch(`${apiBase(hospitalId)}?mode=lookups`, {
				method: 'GET',
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed (${res.status})`);
			}
			lookups = (await res.json()) as Lookups;
		} catch (err) {
			lookupsError =
				err instanceof Error ? err.message : 'Failed to load lookups';
			lookups = { stores: [], items: [] };
		} finally {
			lookupsLoading = false;
		}
	}

	async function ensureLookupsLoaded() {
		if (!hospitalId) return;
		if (lookups.stores.length === 0 || lookups.items.length === 0) {
			await loadLookups();
		}
	}

	async function openCreateDialog() {
		if (!hospitalId) return;
		await ensureLookupsLoaded();

		const result = await dialogService.open({
			title: m.inv_reorder_level_create(),
			modalClassName: 'max-w-xl',
			component: ReorderLevelFormDialogContent,
			props: {
				mode: 'create',
				hospitalId,
				stores: lookups.stores,
				items: lookups.items,
				loading: lookupsLoading,
				error: lookupsError,
				onSave: async (payload: ReorderSavePayload) => {
					const res = await fetch(apiBase(hospitalId), {
						method: 'POST',
						credentials: 'include',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							storeId: payload.storeId,
							itemId: payload.itemId,
							itemUnitMasterId: payload.itemUnitMasterId,
							minQtyPurchase: payload.minQtyPurchase
						})
					});
					if (!res.ok) {
						const t = await res.text().catch(() => '');
						const msg = t || `Create failed (${res.status})`;
						toastService.addToast(msg, StatusColorEnum.ERROR);
						throw new Error(msg);
					}
					toastService.addToast(
						m.inv_reorder_level_created(),
						StatusColorEnum.SUCCESS
					);
				}
			}
		});

		if (result.confirmed) {
			await loadRows(true);
		}
	}

	async function openEditDialog(row: ReorderLevelRow) {
		if (!hospitalId) return;
		await ensureLookupsLoaded();

		const result = await dialogService.open({
			title: m.inv_reorder_level_edit_title(),
			modalClassName: 'max-w-xl',
			component: ReorderLevelFormDialogContent,
			props: {
				mode: 'edit',
				hospitalId,
				stores: lookups.stores,
				items: lookups.items,
				loading: lookupsLoading,
				error: lookupsError,
				initialEdit: {
					id: row.id,
					storeId: row.storeId,
					itemId: row.itemId,
					itemUnitMasterId: row.itemUnitMasterId,
					minQtyIssue: row.minQty
				},
				onSave: async (payload: ReorderSavePayload) => {
					const res = await fetch(apiBase(hospitalId), {
						method: 'POST',
						credentials: 'include',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							id: payload.replaceRowId,
							storeId: payload.storeId,
							itemId: payload.itemId,
							itemUnitMasterId: payload.itemUnitMasterId,
							minQtyPurchase: payload.minQtyPurchase
						})
					});
					if (!res.ok) {
						const t = await res.text().catch(() => '');
						const msg = t || `Save failed (${res.status})`;
						toastService.addToast(msg, StatusColorEnum.ERROR);
						throw new Error(msg);
					}
					toastService.addToast(
						m.inv_reorder_level_updated(),
						StatusColorEnum.SUCCESS
					);
				}
			}
		});

		if (result.confirmed) {
			await loadRows(true);
		}
	}

	async function loadRows(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		loadError = null;
		try {
			const sp = new SvelteURLSearchParams();
			if (forceRefresh) sp.set('_t', String(Date.now()));

			const res = await fetch(
				`${apiBase(hospitalId)}?${sp.toString()}`,
				{
					method: 'GET',
					credentials: 'include',
					cache: 'no-store'
				}
			);
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed (${res.status})`);
			}
			rows = (await res.json()) as ReorderLevelRow[];
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Load failed';
			rows = [];
		} finally {
			isLoading = false;
		}
	}

	async function deleteRow(row: ReorderLevelRow) {
		if (!hospitalId) return;
		deletingById = { ...deletingById, [row.id]: true };
		try {
			const res = await fetch(apiBase(hospitalId), {
				method: 'DELETE',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: row.id })
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Delete failed (${res.status})`);
			}
			rows = rows.filter((r) => r.id !== row.id);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : 'Delete failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			const next = { ...deletingById };
			delete next[row.id];
			deletingById = next;
		}
	}

	$effect(() => {
		void hospitalId;
		loadRows();
	});

	const columns: MariTableColumn<ReorderLevelRow>[] = [
		{
			id: 'storeName',
			header: m.inv_common_store(),
			field: 'storeName',
			widthClass: 'w-56 min-w-[12rem]',
			filterType: 'text',
			format: (_v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: m.inv_common_item(),
			field: 'itemName',
			widthClass: 'w-72 min-w-[16rem]',
			filterType: 'text',
			format: (_v, row) => row.itemName ?? '—'
		},
		{
			id: 'minQty',
			header: m.inv_reorder_level_min_qty(),
			field: 'minQty',
			widthClass: 'w-44 min-w-[11rem]',
			filterable: false,
			format: (_v, row) => formatReorderMinQty(row)
		}
	];
</script>

<div class="space-y-4">
	<div
		class="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
	>
		<div class="space-y-1">
			<h1 class="text-lg font-semibold">
				{m.inv_reorder_level_title()}
			</h1>
			<p class="text-sm opacity-70">
				{m.inv_reorder_level_subtitle()}
			</p>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-primary"
				disabled={isLoading}
				onClick={() => void openCreateDialog()}
			>
				{m.inv_reorder_level_add()}
			</DaisyUiButton>
		</div>
	</div>

	{#if loadError}
		<div class="d-alert d-alert-error">
			<span>{loadError}</span>
		</div>
	{/if}

	<DaisyUiCard>
		<DaisyUiCardBody className="p-0">
			<div class={TableEnum.HEIGHT}>
				<MariTable
					{rows}
					{columns}
					{isLoading}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.service_item_no_records_found()}
					enableColumnFilters={true}
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					on:refresh={() => loadRows(true)}
				>
					{#snippet rowActions(row, rowIndex)}
						<td class="text-right" aria-rowindex={rowIndex + 2}>
							<div class="flex justify-end gap-1">
								<DaisyUiTooltip
									tooltipText={m.inv_line_items_tooltip_edit()}
									className="d-tooltip-ghost d-tooltip-right"
								>
									<DaisyUiButton
										type="button"
										className="d-btn-sm d-btn-ghost d-btn-square"
										disabled={!!deletingById[row.id]}
										onClick={() => void openEditDialog(row)}
									>
										<LucidePencil className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText={m.inv_line_items_tooltip_delete()}
									className="d-tooltip-error d-tooltip-right"
								>
									<DaisyUiButton
										type="button"
										className="d-btn-sm d-btn-ghost d-btn-square text-error"
										disabled={!!deletingById[row.id]}
										loading={!!deletingById[row.id]}
										loadingText=""
										onClick={() => void deleteRow(row)}
									>
										<LucideTrash2 className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							</div>
						</td>
					{/snippet}
				</MariTable>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
