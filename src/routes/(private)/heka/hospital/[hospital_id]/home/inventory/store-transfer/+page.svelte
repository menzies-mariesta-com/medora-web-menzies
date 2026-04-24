<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { toastError, toastLine } from '$lib/util/toast-copy.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const toastService = new ToastService();

	type StoreOpt = { id: number; storeName: string | null };

	type LotRow = {
		batchId: number;
		itemId: number;
		itemName: string | null;
		batchNo: string;
		expiryDate: string | null;
		quantity: string;
	};

	type Line = {
		key: string;
		lotKey: string;
		batchId: number;
		itemId: number;
		unitId: number;
		quantity: string;
	};

	let stores = $state<StoreOpt[]>([]);
	let fromStoreId = $state<number | null>(null);
	let toStoreId = $state<number | null>(null);
	let remark = $state('');
	let lots = $state<LotRow[]>([]);
	let lines = $state<Line[]>([]);
	let loadingLots = $state(false);
	let submitting = $state(false);

	async function loadStores() {
		if (!hospitalId) return;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(await res.text());
			stores = (await res.json()) as StoreOpt[];
			if (stores.length && fromStoreId == null) fromStoreId = stores[0].id;
			if (stores.length > 1 && toStoreId == null) {
				toStoreId = stores[1].id;
			}
		} catch (e) {
			toastError(toastService, m.entity_store(), m.toast_action_loaded_failed(), e);
		}
	}

	async function getIssueUnitId(itemId: number): Promise<number | null> {
		if (!hospitalId) return null;
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
			itemUnitMasterIds?: number[];
			defaultItemUnitMasterId?: number | null;
		};
		const allIum = (await iumRes.json()) as {
			id: number;
			issueUnitId: number;
		}[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		const list = allIum.filter((u) => allowed.has(u.id));
		const def = detail.defaultItemUnitMasterId;
		const pick =
			list.find((u) => u.id === def) ?? list[0];
		return pick?.issueUnitId ?? null;
	}

	async function loadLots() {
		if (!hospitalId || fromStoreId == null) {
			lots = [];
			return;
		}
		loadingLots = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/stock?mode=lots&storeId=${fromStoreId}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(await res.text());
			const raw = (await res.json()) as Record<string, unknown>[];
			lots = raw.map((r) => ({
				batchId: Number(r.batchId),
				itemId: Number(r.itemId),
				itemName: (r.itemName as string) ?? null,
				batchNo: String(r.batchNo ?? ''),
				expiryDate: (r.expiryDate as string) ?? null,
				quantity: String(r.quantity ?? '0')
			}));
		} catch (e) {
			toastError(
				toastService,
				m.entity_inventory(),
				m.toast_action_loaded_failed(),
				e
			);
		} finally {
			loadingLots = false;
		}
	}

	function lotLabel(l: LotRow): string {
		return `${l.itemName ?? '—'} · ${l.batchNo} · avail ${l.quantity}`;
	}

	function addLine() {
		const first = lots[0];
		if (!first) return;
		void appendLineFromLot(first);
	}

	async function appendLineFromLot(l: LotRow) {
		const uid = await getIssueUnitId(l.itemId);
		if (uid == null) {
			toastService.addToast(
				toastLine(
					m.entity_store_transfer(),
					m.toast_action_submitted_failed()
				),
				StatusColorEnum.ERROR,
				'Could not resolve issue unit for item.'
			);
			return;
		}
		lines = [
			...lines,
			{
				key: crypto.randomUUID(),
				lotKey: `${l.batchId}-${l.itemId}`,
				batchId: l.batchId,
				itemId: l.itemId,
				unitId: uid,
				quantity: '1'
			}
		];
	}

	async function onLineLotChange(line: Line, lotKey: string) {
		const [b, i] = lotKey.split('-').map(Number);
		const l = lots.find((x) => x.batchId === b && x.itemId === i);
		if (!l) return;
		const uid = await getIssueUnitId(l.itemId);
		if (uid == null) {
			toastService.addToast(
				toastLine(
					m.entity_store_transfer(),
					m.toast_action_submitted_failed()
				),
				StatusColorEnum.ERROR,
				'Could not resolve issue unit for item.'
			);
			return;
		}
		line.lotKey = lotKey;
		line.batchId = l.batchId;
		line.itemId = l.itemId;
		line.unitId = uid;
		lines = [...lines];
	}

	async function submit() {
		if (!hospitalId || fromStoreId == null || toStoreId == null) return;
		if (fromStoreId === toStoreId) {
			toastService.addToast(
				toastLine(
					m.entity_store_transfer(),
					m.toast_action_submitted_failed()
				),
				StatusColorEnum.ERROR,
				'From and to store must differ.'
			);
			return;
		}
		const payload = lines
			.map((l) => ({
				itemId: l.itemId,
				batchId: l.batchId,
				quantity: l.quantity.trim(),
				unitId: l.unitId
			}))
			.filter((l) => Number(l.quantity) > 0);
		if (payload.length === 0) {
			toastService.addToast(
				toastLine(
					m.entity_store_transfer(),
					m.toast_action_submitted_failed()
				),
				StatusColorEnum.ERROR,
				'Add at least one line.'
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/transfer`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						fromStoreId,
						toStoreId,
						remark: remark.trim() || null,
						lines: payload
					})
				}
			);
			if (!res.ok) {
				const detail = await res.text();
				toastService.addToast(
					toastLine(
						m.entity_store_transfer(),
						m.toast_action_submitted_failed()
					),
					StatusColorEnum.ERROR,
					detail
				);
				return;
			}
			lines = [];
			remark = '';
			await loadLots();
		} finally {
			submitting = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void loadStores();
	});

	$effect(() => {
		void fromStoreId;
		void hospitalId;
		void loadLots();
	});
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<fieldset class="m-0 min-w-0 border-0 p-0">
				<DaisyUiCardBodyTitle className="mb-2">
					{m.inv_page_transfer_title()}
				</DaisyUiCardBodyTitle>
			</fieldset>

			<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
				<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
					<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						<div class="flex flex-col gap-4">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_transfer_from_store()}</DaisyUiLabel>
								<div class="max-w-80 flex-1">
									<DaisyUISearchSelect
										value={fromStoreId != null ? String(fromStoreId) : ''}
										options={stores.map((s) => ({
											label: s.storeName ?? '—',
											value: String(s.id)
										}))}
										onChange={(v: string) => {
											fromStoreId = v ? Number(v) : null;
										}}
										placeholder="Select store..."
										className="w-full"
									/>
								</div>
							</div>
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_transfer_to_store()}</DaisyUiLabel>
								<div class="max-w-80 flex-1">
									<DaisyUISearchSelect
										value={toStoreId != null ? String(toStoreId) : ''}
										options={stores.map((s) => ({
											label: s.storeName ?? '—',
											value: String(s.id)
										}))}
										onChange={(v: string) => {
											toStoreId = v ? Number(v) : null;
										}}
										placeholder="Select store..."
										className="w-full"
									/>
								</div>
							</div>
						</div>
						<div class="flex flex-col gap-4">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_transfer_remark()}</DaisyUiLabel>
								<div class="max-w-80 flex-1">
									<DaisyUiInputField inputType="text" bind:value={remark} />
								</div>
							</div>
						</div>
					</div>
				</fieldset>
			</div>

			<div class="mt-8">
				{#if loadingLots}
					<div class="py-12 flex justify-center border border-base-200 rounded-lg">
						<p class="text-sm opacity-70 flex items-center gap-2">
							<span class="loading loading-spinner loading-sm"></span>
							{m.loading()}
						</p>
					</div>
				{:else if lots.length === 0}
					<div class="py-12 flex justify-center border border-base-200 rounded-lg bg-base-100/50">
						<p class="text-sm opacity-70">{m.inv_stock_empty()} in Source Store</p>
					</div>
				{:else}
					<div class="flex items-center justify-between mb-4 border-b border-base-200 pb-2">
						<h3 class="font-medium text-lg">Transfer Lines</h3>
						<DaisyUiButton 
							type="button"
							className="d-btn-sm d-btn-outline d-btn-primary" 
							onClick={() => addLine()}
						>
							<LucidePlus className="size-4 mr-1" />
							{m.inv_transfer_add_line()}
						</DaisyUiButton>
					</div>
					
					<div class="space-y-3">
						{#each lines as line (line.key)}
							<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center border border-base-200 bg-base-100/50 rounded-lg p-3 hover:border-primary/30 transition-colors">
								<div class="flex-1 flex flex-col sm:flex-row gap-3 w-full">
									<div class="flex-1 min-w-[200px]">
										<DaisyUiLabel className="text-xs mb-1 block">{m.inv_transfer_line_batch()}</DaisyUiLabel>
										<DaisyUISearchSelect
											value={line.lotKey}
											options={lots.map((l) => ({
												label: lotLabel(l),
												value: `${l.batchId}-${l.itemId}`
											}))}
											onChange={(v: string) => {
												if (v) onLineLotChange(line, v);
											}}
											placeholder="Select batch..."
											className="w-full"
										/>
									</div>
									<div class="w-full sm:w-32">
										<DaisyUiLabel className="text-xs mb-1 block">{m.inv_common_quantity()}</DaisyUiLabel>
										<DaisyUiInputField
											inputType="text"
											className="input-sm w-full"
											bind:value={line.quantity}
										/>
									</div>
								</div>
								
								<div class="pt-6 sm:pt-0 self-end sm:self-center">
									<DaisyUiButton
										type="button"
										className="d-btn-ghost d-btn-sm text-error bg-error/10 hover:bg-error hover:text-error-content"
										onClick={() => {
											lines = lines.filter((x) => x.key !== line.key);
										}}
										title={m.inv_common_remove_line()}
									>
										<LucideTrash2 className="size-4" />
									</DaisyUiButton>
								</div>
							</div>
						{:else}
							<div class="py-8 flex justify-center border border-base-200 border-dashed rounded-lg bg-base-100/50">
								<p class="text-sm opacity-50 flex flex-col items-center gap-2">
									<span>No items added for transfer</span>
									<DaisyUiButton 
										type="button" 
										className="d-btn-xs d-btn-outline" 
										onClick={() => addLine()}
									>
										Click here to add one
									</DaisyUiButton>
								</p>
							</div>
						{/each}
					</div>

					{#if lines.length > 0}
						<DaisyUiCardBodyAction className="mt-8 pt-6 border-t border-base-200">
							<DaisyUiButton
								type="submit"
								className="d-btn-primary d-btn-wide"
								disabled={submitting}
							>
								{m.inv_transfer_submit()}
							</DaisyUiButton>
						</DaisyUiCardBodyAction>
					{/if}
				{/if}
			</div>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
