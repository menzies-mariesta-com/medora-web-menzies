<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

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
		quantity: string;
	};

	type IumOpt = {
		id: number;
		conversionDisplay: string;
		issueUnitId: number;
	};

	type LineBatch = {
		key: string;
		mode: 'batch';
		lotKey: string;
		batchId: number;
		itemId: number;
		unitId: number;
		qty: string;
	};

	type LineFefo = {
		key: string;
		mode: 'fefo';
		itemId: number | null;
		itemLabel: string;
		itemSearch: string;
		hits: { id: number; itemName: string | null }[];
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
		qty: string;
	};

	type Line = LineBatch | LineFefo;

	let stores = $state<StoreOpt[]>([]);
	let storeId = $state<number | null>(null);
	let issuedTo = $state('');
	let reason = $state('');
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
			if (stores.length && storeId == null) storeId = stores[0].id;
		} catch (e) {
			toastService.addErrorToast('Could not load stores', e);
		}
	}

	async function getIssueUnitIdFromIum(itemId: number): Promise<number | null> {
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
		const allIum = (await iumRes.json()) as IumOpt[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		const list = allIum.filter((u) => allowed.has(u.id));
		const def = detail.defaultItemUnitMasterId;
		const pick = list.find((u) => u.id === def) ?? list[0];
		return pick?.issueUnitId ?? null;
	}

	async function loadLots() {
		if (!hospitalId || storeId == null) {
			lots = [];
			return;
		}
		loadingLots = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/stock?mode=lots&storeId=${storeId}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(await res.text());
			const raw = (await res.json()) as Record<string, unknown>[];
			lots = raw.map((r) => ({
				batchId: Number(r.batchId),
				itemId: Number(r.itemId),
				itemName: (r.itemName as string) ?? null,
				batchNo: String(r.batchNo ?? ''),
				quantity: String(r.quantity ?? '0')
			}));
		} catch (e) {
			toastService.addErrorToast('Could not load lots', e);
		} finally {
			loadingLots = false;
		}
	}

	function lotLabel(l: LotRow): string {
		return `${l.itemName ?? '—'} · ${l.batchNo} · ${l.quantity}`;
	}

	async function addBatchLine() {
		const first = lots[0];
		if (!first) return;
		const uid = await getIssueUnitIdFromIum(first.itemId);
		if (uid == null) {
			toastService.addToast(
				'Cannot post issue',
				StatusColorEnum.ERROR,
				'Could not resolve issue unit.'
			);
			return;
		}
		lines = [
			...lines,
			{
				key: crypto.randomUUID(),
				mode: 'batch',
				lotKey: `${first.batchId}-${first.itemId}`,
				batchId: first.batchId,
				itemId: first.itemId,
				unitId: uid,
				qty: '1'
			}
		];
	}

	function addFefoLine() {
		lines = [
			...lines,
			{
				key: crypto.randomUUID(),
				mode: 'fefo',
				itemId: null,
				itemLabel: '',
				itemSearch: '',
				hits: [],
				iumList: [],
				itemUnitMasterId: null,
				qty: '1'
			}
		];
	}

	async function onBatchLineLotChange(line: LineBatch, lotKey: string) {
		const [b, i] = lotKey.split('-').map(Number);
		const l = lots.find((x) => x.batchId === b && x.itemId === i);
		if (!l) return;
		const uid = await getIssueUnitIdFromIum(l.itemId);
		if (uid == null) {
			toastService.addToast(
				'Cannot post issue',
				StatusColorEnum.ERROR,
				'Could not resolve issue unit.'
			);
			return;
		}
		line.lotKey = lotKey;
		line.batchId = l.batchId;
		line.itemId = l.itemId;
		line.unitId = uid;
		lines = [...lines];
	}

	async function pickFefoItem(line: LineFefo, itemId: number) {
		if (!hospitalId) return;
		try {
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
			if (!detailRes.ok) throw new Error(await detailRes.text());
			if (!iumRes.ok) throw new Error(await iumRes.text());
			const detail = (await detailRes.json()) as {
				itemName?: string | null;
				itemUnitMasterIds?: number[];
				defaultItemUnitMasterId?: number | null;
			};
			const itemLabel = detail.itemName ?? '—';
			line.itemLabel = itemLabel;
			line.itemSearch = itemLabel;
			const allIum = (await iumRes.json()) as IumOpt[];
			const allowed = new Set(detail.itemUnitMasterIds ?? []);
			line.iumList = allIum.filter((u) => allowed.has(u.id));
			const def = detail.defaultItemUnitMasterId;
			line.itemUnitMasterId =
				def != null && line.iumList.some((u) => u.id === def)
					? def
					: (line.iumList[0]?.id ?? null);
			lines = [...lines];
		} catch (e) {
			toastService.addErrorToast('Could not load item details', e);
		}
	}

	function issueUnitForFefo(line: LineFefo): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.issueUnitId ?? null;
	}

	async function submit() {
		if (!hospitalId || storeId == null) return;
		const bodyLines: {
			itemId: number;
			qty: string;
			unitId: number;
			batchId?: number;
		}[] = [];
		for (const ln of lines) {
			if (ln.mode === 'batch') {
				const q = ln.qty.trim();
				if (!Number(q)) continue;
				bodyLines.push({
					itemId: ln.itemId,
					qty: q,
					unitId: ln.unitId,
					batchId: ln.batchId
				});
			} else {
				const uid = issueUnitForFefo(ln);
				if (ln.itemId == null || uid == null) continue;
				const q = ln.qty.trim();
				if (!Number(q)) continue;
				bodyLines.push({ itemId: ln.itemId, qty: q, unitId: uid });
			}
		}
		if (bodyLines.length === 0) {
			toastService.addToast(
				'Cannot post issue',
				StatusColorEnum.ERROR,
				'Add at least one valid line.'
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/issue`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						storeId,
						issuedTo: issuedTo.trim() || null,
						reason: reason.trim() || null,
						lines: bodyLines
					})
				}
			);
			if (!res.ok) {
				const detail = await res.text();
				toastService.addToast('Cannot post issue', StatusColorEnum.ERROR, detail);
				return;
			}
			lines = [];
			issuedTo = '';
			reason = '';
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
		void storeId;
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
					{m.inv_page_issue_title()}
				</DaisyUiCardBodyTitle>
			</fieldset>

			<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
				<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
					<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
						<div class="flex flex-col gap-4">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_issue_store()}</DaisyUiLabel>
								<div class="max-w-80 flex-1">
									<DaisyUISearchSelect
										value={storeId != null ? String(storeId) : ''}
										options={stores.map((s) => ({
											label: s.storeName ?? '—',
											value: String(s.id)
										}))}
										onChange={(v: string) => {
											storeId = v ? Number(v) : null;
										}}
										placeholder="Select store..."
										className="w-full"
									/>
								</div>
							</div>
							
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_issue_issued_to()}</DaisyUiLabel>
								<div class="max-w-80 flex-1">
									<DaisyUiInputField inputType="text" bind:value={issuedTo} />
								</div>
							</div>
						</div>
						
						<div class="flex flex-col gap-4">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36 mt-2">{m.inv_issue_reason()}</DaisyUiLabel>
								<div class="max-w-80 flex-1">
									<textarea class="textarea textarea-bordered w-full h-[88px] resize-none" bind:value={reason}></textarea>
								</div>
							</div>
						</div>
					</div>
				</fieldset>
			</div>

			<div class="mt-8">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-base-200 pb-2">
					<h3 class="font-medium text-lg">Issue Lines</h3>
					<div class="flex flex-wrap gap-2">
						<DaisyUiButton
							type="button"
							className="d-btn-outline d-btn-primary"
							disabled={lots.length === 0}
							onClick={() => addBatchLine()}
						>
							<LucidePlus className="size-4 mr-1" />
							{m.inv_transfer_add_line()}
						</DaisyUiButton>
						<DaisyUiButton 
							type="button"
							className="d-btn-outline d-btn-secondary" 
							onClick={() => addFefoLine()}
						>
							<LucidePlus className="size-4 mr-1" />
							{m.inv_issue_add_line()}
						</DaisyUiButton>
					</div>
				</div>

				{#if loadingLots}
					<div class="py-12 flex justify-center border border-base-200 rounded-lg">
						<p class="text-sm opacity-70 flex items-center gap-2">
							<span class="loading loading-spinner loading-sm"></span>
							{m.loading()}
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each lines as line (line.key)}
							{#if line.mode === 'batch'}
								<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center border border-base-200 bg-base-100/50 rounded-lg p-3 hover:border-primary/30 transition-colors">
									<div class="badge badge-primary badge-outline mt-1 sm:mt-0 shrink-0">Batch</div>
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
													if (v) onBatchLineLotChange(line, v);
												}}
												placeholder="Select batch..."
												className="w-full"
											/>
										</div>
										<div class="w-full sm:w-32">
											<DaisyUiLabel className="text-xs mb-1 block">{m.inv_issue_line_qty()}</DaisyUiLabel>
											<DaisyUiInputField
												inputType="text"
												className="w-full"
												bind:value={line.qty}
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
								<div class="flex flex-col gap-3 border border-base-200 bg-base-100/50 rounded-lg p-3 hover:border-secondary/30 transition-colors">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<div class="badge badge-secondary badge-outline shrink-0">FEFO</div>
										<DaisyUiButton
											type="button"
											className="d-btn-ghost d-btn-sm text-error bg-error/10 hover:bg-error hover:text-error-content sm:hidden"
											onClick={() => {
												lines = lines.filter((x) => x.key !== line.key);
											}}
										>
											<LucideTrash2 className="size-4 mr-1" /> Remove
										</DaisyUiButton>
									</div>
									
									<div class="flex flex-col sm:flex-row gap-3 w-full">
										<div class="flex-1 min-w-[200px]">
											<DaisyUiLabel className="text-xs mb-1 block">{m.inv_pr_line_item_search()}</DaisyUiLabel>
											<DaisyUISearchSelect
												value={line.itemId ? String(line.itemId) : ''}
												searchFn={async (q: string) => {
													try {
														const qEnc = encodeURIComponent(q.trim());
														const res = await fetch(
															`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
														);
														if (!res.ok) throw new Error(await res.text());
														const j = await res.json();
														return (j.data ?? []).map((x: any) => ({
															label: x.itemName ?? '—',
															value: String(x.id)
														}));
													} catch (e) {
														toastService.addErrorToast('Could not search items', e);
														return [];
													}
												}}
												onChange={(v: string) => {
													if (v) {
														pickFefoItem(line, Number(v));
													}
												}}
												placeholder="Search item..."
												className="w-full"
											/>
										</div>

										{#if line.itemId != null}
											<div class="w-full sm:w-48">
												<DaisyUiLabel className="text-xs mb-1 block">{m.inv_pr_line_select_conversion()}</DaisyUiLabel>
												<DaisyUISearchSelect
													value={line.itemUnitMasterId != null ? String(line.itemUnitMasterId) : ''}
													options={line.iumList.map((u) => ({
														label: u.conversionDisplay,
														value: String(u.id)
													}))}
													onChange={(v: string) => {
														line.itemUnitMasterId = v ? Number(v) : null;
													}}
													placeholder="Select Unit..."
													className="w-full"
												/>
											</div>
											<div class="w-full sm:w-32">
												<DaisyUiLabel className="text-xs mb-1 block">{m.inv_issue_line_qty()}</DaisyUiLabel>
												<DaisyUiInputField
													inputType="text"
													className="w-full"
													bind:value={line.qty}
												/>
											</div>
										{/if}
										
										<div class="hidden sm:block self-end sm:self-end pb-[2px]">
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
									

								</div>
							{/if}
						{:else}
							<div class="py-8 flex justify-center border border-base-200 border-dashed rounded-lg bg-base-100/50">
								<p class="text-sm opacity-50 flex flex-col items-center gap-2">
									<span>No items added for issue</span>
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
								{m.inv_issue_submit()}
							</DaisyUiButton>
						</DaisyUiCardBodyAction>
					{/if}
				{/if}
			</div>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>
